export const createSosToken = ({ lat, lng, userId, timestamp = Date.now() }) => {
  return btoa(`${lat}|${lng}|${userId}|${timestamp}`);
};

export const buildPublicSosUrl = ({ lat, lng, userId, origin = window.location.origin, timestamp }) => {
  return `${origin}/sos/${createSosToken({ lat, lng, userId, timestamp })}`;
};

export const buildSosShareText = ({ userName, lat, lng, shareUrl, isTest = false }) => {
  const prefix = isTest ? '[TEST] ' : '';
  return `${prefix}TrackSphere Alert: ${userName} triggered an SOS. View location: https://www.google.com/maps?q=${lat},${lng} Track live status: ${shareUrl}`;
};

export const buildWhatsAppShareUrl = ({ text, phone = '' }) => {
  const cleanedPhone = phone.replace(/[^\d]/g, '');

  if (cleanedPhone) {
    return `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(text)}`;
  }

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

export const buildTelegramShareUrl = ({ text, shareUrl }) => {
  return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
};
