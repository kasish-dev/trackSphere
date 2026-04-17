import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ensureRazorpayLoaded = () => {
  if (!window.Razorpay) {
    throw new Error('Razorpay checkout is not available in this browser session.');
  }
};

export const startPlanCheckout = async ({ plan, authUser, onVerified }) => {
  if (!plan?.id || plan.id === 'free') {
    return;
  }

  const token = authUser?.token;
  if (!token) {
    throw new Error('You must be logged in to upgrade your plan.');
  }

  const { data } = await axios.post(
    `${API_URL}/api/payment/create-order`,
    { plan: plan.id },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const paymentMode = data?.mode || (data.order?.mock ? 'mock' : 'live');

  const verifyPayment = async (payload) => {
    const verifyRes = await axios.post(
      `${API_URL}/api/payment/verify-payment`,
      {
        ...payload,
        plan: plan.id,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (verifyRes.data?.success && onVerified) {
      onVerified(verifyRes.data?.data || {});
    }

    return verifyRes.data;
  };

  const logFailure = async ({ reason, orderId = null, paymentId = null, status = 'failed' }) => {
    try {
      await axios.post(
        `${API_URL}/api/payment/log-failure`,
        {
          plan: plan.id,
          reason,
          orderId,
          paymentId,
          status,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to log payment failure:', error);
    }
  };

  if (data.order?.mock) {
    const verification = await verifyPayment({
      razorpay_order_id: data.order.id,
      razorpay_payment_id: `pay_mock_${Date.now()}`,
      razorpay_signature: 'mock_signature',
    });

    return {
      ...verification,
      checkoutMode: paymentMode,
    };
  }

  ensureRazorpayLoaded();

  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      key: data.key,
      amount: data.order.amount,
      currency: data.order.currency,
      name: 'Ksynq',
      description: `${plan.name} subscription`,
      order_id: data.order.id,
      prefill: {
        name: authUser?.user?.name || '',
        email: authUser?.user?.email || '',
      },
      notes: {
        planId: plan.id,
      },
      theme: {
        color: '#4f46e5',
      },
      handler: async (response) => {
        try {
          const verification = await verifyPayment(response);
          resolve({
            ...verification,
            checkoutMode: paymentMode,
          });
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: async () => {
          await logFailure({ reason: 'Payment cancelled by user', orderId: data.order.id, status: 'cancelled' });
          reject(new Error('Payment cancelled'));
        },
      },
    });

    razorpay.open();
  });
};

export const fetchPaymentHistory = async ({ authUser }) => {
  const token = authUser?.token;
  if (!token) {
    throw new Error('You must be logged in to view billing history.');
  }

  const { data } = await axios.get(`${API_URL}/api/payment/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.data || [];
};

export const openInvoicePrintView = async ({ authUser, invoiceId }) => {
  const token = authUser?.token;
  if (!token) {
    throw new Error('You must be logged in to open invoices.');
  }

  const invoiceWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!invoiceWindow) {
    throw new Error('Popup blocked. Please allow popups to open the invoice.');
  }

  invoiceWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Preparing Invoice...</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
        </style>
      </head>
      <body>
        <h2>Preparing your invoice...</h2>
        <p>Please wait while Ksynq loads the printable invoice.</p>
      </body>
    </html>
  `);
  invoiceWindow.document.close();

  try {
    const { data } = await axios.get(`${API_URL}/api/payment/invoice/${invoiceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const html = data?.data?.html;
    if (!html) {
      throw new Error('Invoice HTML is not available.');
    }

    invoiceWindow.document.open();
    invoiceWindow.document.write(html);
    invoiceWindow.document.close();
    invoiceWindow.focus();
    setTimeout(() => invoiceWindow.print(), 400);

    return data?.data?.invoice || null;
  } catch (error) {
    invoiceWindow.close();
    throw error;
  }
};

export const logPaymentFailure = async ({ authUser, planId, reason, orderId = null, paymentId = null, status = 'failed' }) => {
  const token = authUser?.token;
  if (!token) {
    throw new Error('You must be logged in to record billing failures.');
  }

  const { data } = await axios.post(
    `${API_URL}/api/payment/log-failure`,
    {
      plan: planId,
      reason,
      orderId,
      paymentId,
      status,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return data?.data || null;
};
