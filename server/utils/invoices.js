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
    :root {
      --ink: #0f172a;
      --muted: #475569;
      --line: #dbe4f0;
      --panel: #ffffff;
      --brand: #4f46e5;
      --brand2: #0891b2;
      --soft: #f8fafc;
      --success: #059669;
    }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      color: var(--ink);
      background: var(--soft);
    }
    .page {
      padding: 28px;
    }
    .hero {
      background: linear-gradient(135deg, var(--brand), var(--brand2));
      color: #fff;
      border-radius: 24px;
      padding: 28px;
      position: relative;
      overflow: hidden;
    }
    .hero::after {
      content: '';
      position: absolute;
      width: 260px;
      height: 260px;
      right: -70px;
      top: -120px;
      border-radius: 999px;
      background: rgba(255,255,255,0.14);
    }
    .eyebrow {
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-weight: 700;
      opacity: 0.9;
    }
    .hero-row {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 24px;
      margin-top: 12px;
    }
    .hero h1 {
      margin: 0;
      font-size: 34px;
      line-height: 1.1;
    }
    .hero p {
      margin: 8px 0 0;
      font-size: 14px;
      color: rgba(255,255,255,0.92);
    }
    .invoice-chip {
      min-width: 220px;
      background: rgba(255,255,255,0.14);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 18px;
      padding: 14px 16px;
    }
    .chip-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      opacity: 0.82;
      margin-bottom: 6px;
    }
    .chip-value {
      font-size: 16px;
      font-weight: 800;
    }
    .section {
      margin-top: 20px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 22px;
    }
    .section-title {
      margin: 0 0 16px;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px;
      background: linear-gradient(180deg, #ffffff, #f8fbff);
    }
    .panel h2 {
      margin: 0 0 12px;
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin-bottom: 4px;
      font-weight: 700;
    }
    .value {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
    }
    th, td {
      padding: 14px;
      text-align: left;
      border-bottom: 1px solid var(--line);
      font-size: 13px;
    }
    th {
      background: #f8fbff;
      color: var(--muted);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 800;
    }
    tr:nth-child(even) td {
      background: #fcfdff;
    }
    .summary-row {
      display: flex;
      justify-content: flex-end;
      margin-top: 18px;
    }
    .total-card {
      min-width: 280px;
      border-radius: 20px;
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: #fff;
      padding: 18px 20px;
    }
    .total-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      opacity: 0.74;
    }
    .total-value {
      font-size: 28px;
      font-weight: 800;
      margin-top: 8px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      background: #dcfce7;
      color: var(--success);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .footnote {
      margin-top: 18px;
      text-align: right;
      color: var(--muted);
      font-size: 11px;
    }
    @page {
      size: A4;
      margin: 16mm;
    }
    @media print {
      body { background: #fff; }
      .page { padding: 0; }
      .hero, .section, .panel, table, .total-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <div class="eyebrow">TrackSphere Billing</div>
      <div class="hero-row">
        <div>
          <h1>Invoice</h1>
          <p>Subscription billing summary for your TrackSphere plan purchase.</p>
        </div>
        <div class="invoice-chip">
          <div class="chip-label">Invoice Number</div>
          <div class="chip-value">${record.invoiceNumber}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Billing Overview</h2>
      <div class="grid">
        <div class="panel">
          <h2>Billed To</h2>
          <div class="label">Customer Name</div>
          <div class="value">${user.name}</div>
          <div class="label">Email Address</div>
          <div class="value">${user.email}</div>
        </div>
        <div class="panel">
          <h2>Payment Details</h2>
          <div class="label">Provider</div>
          <div class="value">${record.provider}</div>
          <div class="label">Payment Mode</div>
          <div class="value">${record.mode}</div>
          <div class="label">Paid At</div>
          <div class="value">${new Date(record.paidAt).toLocaleString()}</div>
          <div class="label">Status</div>
          <div class="value"><span class="badge">${record.status}</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Plan Charges</h2>
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
      <div class="summary-row">
        <div class="total-card">
          <div class="total-label">Total Paid</div>
          <div class="total-value">${record.amount} ${record.currency}</div>
        </div>
      </div>
    </section>

    <div class="footnote">Generated by TrackSphere Billing</div>
  </div>
</body>
</html>`;

module.exports = {
  buildInvoiceHtml,
  createPaymentRecord,
  serializePaymentRecord,
};
