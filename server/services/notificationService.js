/**
 * Ksynq Notification Service
 * Handles live SMS via Twilio and free fallback share links for SOS alerts.
 */

const hasTwilioConfig = () => {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
};

const hasWhatsAppConfig = () => {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  );
};

const getFrontendBaseUrl = () => {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
};

const createSosToken = ({ userId, location, timestamp }) => {
  return Buffer.from(
    `${location.lat}|${location.lng}|${userId}|${timestamp}`,
    'utf8'
  ).toString('base64');
};

const buildPublicSosUrl = ({ user, location, timestamp }) => {
  const token = createSosToken({
    userId: user._id || user.id,
    location,
    timestamp,
  });

  return `${getFrontendBaseUrl()}/sos/${encodeURIComponent(token)}`;
};

const buildEmergencyMessage = ({ user, location, type, publicSosUrl }) => {
  const modeLabel = type === 'TEST_SOS' ? '[TEST] ' : '';
  return `${modeLabel}Ksynq Alert: ${user.name} triggered an SOS. View location: https://www.google.com/maps?q=${location.lat},${location.lng} Track live status: ${publicSosUrl}`;
};

const buildMailtoLink = ({ to, subject, body }) => {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const buildWhatsAppLink = ({ phone, body }) => {
  const cleanedPhone = (phone || '').replace(/[^\d]/g, '');

  if (cleanedPhone) {
    return `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(body)}`;
  }

  return `https://wa.me/?text=${encodeURIComponent(body)}`;
};

const buildTelegramLink = ({ body, publicSosUrl }) => {
  return `https://t.me/share/url?url=${encodeURIComponent(publicSosUrl)}&text=${encodeURIComponent(body)}`;
};

const buildFallbackLinks = ({ user, location, type, contacts, timestamp }) => {
  const publicSosUrl = buildPublicSosUrl({ user, location, timestamp });
  const shareText = buildEmergencyMessage({ user, location, type, publicSosUrl });

  return {
    publicSosUrl,
    shareText,
    whatsappUrl: buildWhatsAppLink({ body: shareText }),
    whatsappLinks: (contacts || [])
      .filter((contact) => contact.phone)
      .map((contact) => ({
        contact: contact.name,
        phone: contact.phone,
        url: buildWhatsAppLink({ phone: contact.phone, body: shareText }),
      })),
    telegramUrl: buildTelegramLink({ body: shareText, publicSosUrl }),
    mailtoLinks: (contacts || [])
      .filter((contact) => contact.email)
      .map((contact) => ({
        contact: contact.name,
        email: contact.email,
        url: buildMailtoLink({
          to: contact.email,
          subject: `${type === 'TEST_SOS' ? '[TEST] ' : ''}Ksynq SOS Alert`,
          body: shareText,
        }),
      })),
  };
};

const sendWhatsAppViaCloud = async ({ to, body }) => {
  const response = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'WhatsApp Cloud API request failed');
  }

  return {
    provider: 'whatsapp-cloud',
    messageId: data.messages?.[0]?.id || null,
  };
};

const sendSmsViaTwilio = async ({ to, body }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', from);
  params.append('Body', body);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Twilio SMS request failed');
  }

  return {
    provider: 'twilio',
    sid: data.sid,
    status: data.status,
  };
};

exports.sendEmergencyAlert = async ({ type, user, contacts, location }) => {
  console.log('\n--- EMERGENCY ALERT SYSTEM ---');
  console.log(`TYPE: ${type}`);
  console.log(`USER: ${user.name} (${user.email})`);
  console.log(`LOCATION: https://www.google.com/maps?q=${location.lat},${location.lng}`);

  if (!contacts || contacts.length === 0) {
    console.log('No emergency contacts configured for this user.');
    return {
      success: false,
      sentCount: 0,
      results: [],
      fallback: null,
      error: 'No emergency contacts configured',
    };
  }

  console.log(`CONTACTING ${contacts.length} EMERGENCY CONTACTS...`);

  const timestamp = Date.now();
  const fallback = buildFallbackLinks({ user, location, type, contacts, timestamp });
  const results = [];
  const smsBody = fallback.shareText;

  for (const contact of contacts) {
    const preferredChannel = contact.preferredChannel || 'sms';

    if (contact.phone && preferredChannel === 'whatsapp') {
      try {
        if (hasWhatsAppConfig()) {
          const waResult = await sendWhatsAppViaCloud({
            to: contact.phone.replace(/[^\d]/g, ''),
            body: smsBody,
          });

          console.log(`[WHATSAPP SENT] to ${contact.name} (${contact.phone})`);
          results.push({
            contact: contact.name,
            phone: contact.phone,
            channel: 'whatsapp',
            success: true,
            mode: 'live',
            provider: waResult.provider,
            messageId: waResult.messageId,
          });
        } else {
          console.log(`[WHATSAPP FALLBACK READY] for ${contact.name} (${contact.phone})`);
          results.push({
            contact: contact.name,
            phone: contact.phone,
            channel: 'whatsapp',
            success: false,
            mode: 'share-link',
            whatsappUrl: buildWhatsAppLink({ phone: contact.phone, body: smsBody }),
          });
        }
      } catch (error) {
        console.error(`WhatsApp failed for ${contact.phone}:`, error.message);
        results.push({
          contact: contact.name,
          phone: contact.phone,
          channel: 'whatsapp',
          success: false,
          mode: hasWhatsAppConfig() ? 'live' : 'share-link',
          error: error.message,
          whatsappUrl: buildWhatsAppLink({ phone: contact.phone, body: smsBody }),
        });
      }
      continue;
    }

    if (contact.phone) {
      try {
        if (hasTwilioConfig()) {
          const smsResult = await sendSmsViaTwilio({
            to: contact.phone,
            body: smsBody,
          });

          console.log(`[SMS SENT] to ${contact.name} (${contact.phone}) via Twilio`);
          results.push({
            contact: contact.name,
            phone: contact.phone,
            channel: 'sms',
            success: true,
            mode: 'live',
            provider: smsResult.provider,
            status: smsResult.status,
          });
        } else {
          console.log(`[SMS FALLBACK READY] for ${contact.name} (${contact.phone})`);
          results.push({
            contact: contact.name,
            phone: contact.phone,
            channel: 'sms',
            success: false,
            mode: 'share-link',
            whatsappUrl: buildWhatsAppLink({ phone: contact.phone, body: smsBody }),
            telegramUrl: buildTelegramLink({ body: smsBody, publicSosUrl: fallback.publicSosUrl }),
          });
        }
      } catch (error) {
        console.error(`SMS failed for ${contact.phone}:`, error.message);
        results.push({
          contact: contact.name,
          phone: contact.phone,
          channel: 'sms',
          success: false,
          mode: hasTwilioConfig() ? 'live' : 'share-link',
          error: error.message,
        });
      }
    }

    if (contact.email) {
      console.log(`[EMAIL FALLBACK READY] for ${contact.name} (${contact.email})`);
      results.push({
        contact: contact.name,
        email: contact.email,
        channel: 'email',
        success: false,
        mode: 'mailto',
        mailtoUrl: buildMailtoLink({
          to: contact.email,
          subject: `${type === 'TEST_SOS' ? '[TEST] ' : ''}Ksynq SOS Alert`,
          body: smsBody,
        }),
      });
    }
  }

  const sentCount = results.filter((item) => item.success).length;

  console.log('All alerts processed.\n');

  return {
    success: sentCount > 0,
    sentCount,
    results,
    fallback,
  };
};

exports.sendSafetyAnomalyReport = async ({ user, type, message }) => {
  console.log('\n--- SAFETY ANOMALY DETECTED ---');
  console.log(`USER: ${user.name}`);
  console.log(`TYPE: ${type}`);
  console.log(`MESSAGE: ${message}`);
  console.log('------------------------------------\n');
};
