const PaymentRecord = require('../models/PaymentRecord');

const buildInvoiceNumber = () => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TS-${stamp}-${random}`;
};

const createPaymentRecord = async ({ user, provider, orderId, paymentId, planConfig, mode }) => {
  return PaymentRecord.create({
    user: user._id,
    provider,
    orderId: orderId || null,
    paymentId: paymentId || null,
    invoiceNumber: buildInvoiceNumber(),
    planId: planConfig.id,
    tier: planConfig.tier,
    planName: planConfig.name,
    amount: planConfig.amount,
    currency: planConfig.currency,
    status: 'paid',
    mode: mode || 'live',
    paidAt: new Date(),
  });
};

const serializePaymentRecord = (record) => ({
  id: record._id,
  invoiceNumber: record.invoiceNumber,
  provider: record.provider,
  orderId: record.orderId,
  paymentId: record.paymentId,
  planId: record.planId,
  tier: record.tier,
  planName: record.planName,
  amount: record.amount,
  currency: record.currency,
  status: record.status,
  mode: record.mode,
  paidAt: record.paidAt,
});

const buildInvoiceHtml = ({ user, record }) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${record.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
    h1, h2, p { margin: 0 0 12px; }
    .row { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
    .box { flex: 1; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    th { background: #f9fafb; }
    .total { text-align: right; margin-top: 24px; font-size: 18px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>TrackSphere Invoice</h1>
  <p>Invoice Number: <strong>${record.invoiceNumber}</strong></p>
  <div class="row">
    <div class="box">
      <h2>Billed To</h2>
      <p>${user.name}</p>
      <p>${user.email}</p>
    </div>
    <div class="box">
      <h2>Payment Details</h2>
      <p>Provider: ${record.provider}</p>
      <p>Payment Mode: ${record.mode}</p>
      <p>Paid At: ${new Date(record.paidAt).toLocaleString()}</p>
      <p>Status: ${record.status}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Plan</th>
        <th>Tier</th>
        <th>Amount</th>
        <th>Currency</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${record.planName}</td>
        <td>${record.tier}</td>
        <td>${record.amount}</td>
        <td>${record.currency}</td>
      </tr>
    </tbody>
  </table>
  <p class="total">Total: ${record.amount} ${record.currency}</p>
</body>
</html>`;

module.exports = {
  buildInvoiceHtml,
  createPaymentRecord,
  serializePaymentRecord,
};
