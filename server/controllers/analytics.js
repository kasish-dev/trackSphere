const Location = require('../models/Location');
const LocationHistory = require('../models/LocationHistory');
const SafetyAlert = require('../models/SafetyAlert');
const mongoose = require('mongoose');

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getAnalyticsPayload = async ({ userId, days }) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const dailyStats = await LocationHistory.aggregate([
    {
      $match: {
        user: userObjectId,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 },
        avgBattery: { $avg: '$batteryLevel' },
        points: { $push: { lat: '$lat', lng: '$lng', time: '$timestamp' } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const processedStats = dailyStats.map((day) => {
    let totalDist = 0;
    for (let i = 1; i < day.points.length; i++) {
      totalDist += getDistance(
        day.points[i - 1].lat, day.points[i - 1].lng,
        day.points[i].lat, day.points[i].lng
      );
    }
    return {
      date: day._id,
      distance: parseFloat(totalDist.toFixed(2)),
      battery: Math.round(day.avgBattery || 0),
      pings: day.count
    };
  });

  const alerts = await SafetyAlert.aggregate([
    {
      $match: {
        user: userObjectId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);

  const totals = processedStats.reduce((acc, item) => {
    acc.distance += item.distance;
    acc.pings += item.pings;
    acc.battery += item.battery;
    return acc;
  }, { distance: 0, pings: 0, battery: 0 });

  const activeDays = processedStats.length;
  const totalAlerts = alerts.reduce((sum, item) => sum + item.count, 0);

  return {
    daily: processedStats,
    alerts,
    summary: {
      totalDistance: Number(totals.distance.toFixed(2)),
      totalPings: totals.pings,
      averageBattery: activeDays ? Math.round(totals.battery / activeDays) : 0,
      activeDays,
      totalAlerts,
      rangeDays: days,
      generatedAt: new Date().toISOString(),
    }
  };
};

const buildPrintableReportHtml = ({ user, rangeLabel, payload }) => {
  const generatedAt = new Date(payload.summary.generatedAt).toLocaleString();
  const reportStart = new Date(Date.now() - (payload.summary.rangeDays * 24 * 60 * 60 * 1000)).toLocaleDateString();
  const reportEnd = new Date().toLocaleDateString();
  const rows = payload.daily.map((day) => `
    <tr>
      <td>${day.date}</td>
      <td>${day.distance} km</td>
      <td>${day.battery}%</td>
      <td>${day.pings}</td>
    </tr>
  `).join('');

  const alertRows = payload.alerts.length
    ? payload.alerts.map((alert) => `
      <tr>
        <td>${alert._id.replace(/_/g, ' ')}</td>
        <td>${alert.count}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="2">No alerts in this period</td></tr>';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>TrackSphere ${rangeLabel} Report</title>
  <style>
    :root {
      --ink: #111827;
      --muted: #4b5563;
      --line: #cbd5e1;
      --soft: #f8fafc;
      --soft-2: #eef2ff;
      --panel: #ffffff;
      --brand: #1d4ed8;
      --brand-dark: #1e3a8a;
    }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      color: var(--ink);
      background: #fff;
    }
    .page {
      padding: 20px;
    }
    .report-shell {
      border: 1px solid var(--line);
      background: var(--panel);
    }
    .report-header {
      border-bottom: 3px solid var(--brand);
      padding: 18px 20px 14px;
      background: linear-gradient(180deg, #f8fbff, #ffffff);
    }
    .report-kicker {
      font-size: 10px;
      color: var(--brand-dark);
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-weight: 700;
    }
    .report-title-row {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 16px;
      margin-top: 8px;
    }
    .report-title {
      margin: 0;
      font-size: 28px;
      line-height: 1.1;
      font-weight: 800;
      color: var(--brand-dark);
    }
    .report-subtitle {
      margin: 6px 0 0;
      font-size: 13px;
      color: var(--muted);
    }
    .report-badge {
      border: 1px solid var(--line);
      background: var(--soft-2);
      padding: 10px 12px;
      min-width: 180px;
      text-align: right;
    }
    .report-badge-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }
    .report-badge-value {
      font-size: 15px;
      font-weight: 700;
      margin-top: 4px;
    }
    .section {
      padding: 16px 20px 0;
    }
    .section-title {
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--brand-dark);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .report-table {
      border: 1px solid var(--line);
      margin-bottom: 14px;
    }
    .report-table thead th {
      background: #edf4ff;
      color: var(--brand-dark);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      padding: 10px 12px;
      border: 1px solid var(--line);
      font-weight: 800;
    }
    .report-table tbody td {
      padding: 10px 12px;
      border: 1px solid var(--line);
      font-size: 12px;
      vertical-align: top;
    }
    .report-table tbody tr:nth-child(even) td {
      background: #fbfdff;
    }
    .meta-table td:first-child,
    .summary-table td:first-child {
      width: 28%;
      color: var(--muted);
      font-weight: 800;
    }
    .summary-table td:last-child {
      font-weight: 700;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 14px;
    }
    .muted-note {
      margin: 0 0 14px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .footnote {
      padding: 6px 20px 20px;
      font-size: 11px;
      color: var(--muted);
      text-align: right;
    }
    @page {
      size: A4;
      margin: 14mm;
    }
    @media print {
      .page { padding: 0; }
      .report-shell, .report-table {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="report-shell">
      <section class="report-header">
        <div class="report-kicker">TrackSphere Analytics</div>
        <div class="report-title-row">
          <div>
            <h1 class="report-title">${rangeLabel} Activity Report</h1>
            <p class="report-subtitle">Structured movement, battery, and alert summary for the selected reporting period.</p>
          </div>
          <div class="report-badge">
            <div class="report-badge-label">Report Type</div>
            <div class="report-badge-value">${rangeLabel}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Report Information</h2>
        <table class="report-table meta-table">
          <tbody>
            <tr><td>Customer Name</td><td>${user.name}</td></tr>
            <tr><td>Email Address</td><td>${user.email}</td></tr>
            <tr><td>Generated At</td><td>${generatedAt}</td></tr>
            <tr><td>Reporting Period</td><td>${reportStart} to ${reportEnd}</td></tr>
            <tr><td>Range Window</td><td>${payload.summary.rangeDays} day(s)</td></tr>
          </tbody>
        </table>
      </section>

      <section class="section">
        <h2 class="section-title">Executive Summary</h2>
        <table class="report-table summary-table">
          <tbody>
            <tr><td>Total Distance Covered</td><td>${payload.summary.totalDistance} km</td></tr>
            <tr><td>Total Location Pings</td><td>${payload.summary.totalPings}</td></tr>
            <tr><td>Average Battery Level</td><td>${payload.summary.averageBattery}%</td></tr>
            <tr><td>Active Days</td><td>${payload.summary.activeDays}</td></tr>
            <tr><td>Total Safety Alerts</td><td>${payload.summary.totalAlerts}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="section">
        <div class="two-col">
          <div>
            <h2 class="section-title">Daily Activity Detail</h2>
            <p class="muted-note">Each row represents one day of recorded tracking history within the report window.</p>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Distance</th>
                  <th>Battery</th>
                  <th>Pings</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="4">No tracking data for this period.</td></tr>'}</tbody>
            </table>
          </div>
          <div>
            <h2 class="section-title">Alert Summary</h2>
            <p class="muted-note">Safety alerts grouped by alert type for the same reporting period.</p>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Alert Type</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>${alertRows}</tbody>
            </table>
          </div>
        </div>
      </section>

      <div class="footnote">Generated by TrackSphere | ${rangeLabel} report | ${payload.summary.rangeDays} day window</div>
    </div>
  </div>
</body>
</html>`;
};

// @desc    Get Daily Analytics Summary
// @route   GET /api/analytics/daily
// @access  Private
exports.getDailyAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const payload = await getAnalyticsPayload({ userId: req.user.id, days });

    res.status(200).json({
      success: true,
      data: payload
    });
  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get analytics report payload
// @route   GET /api/analytics/report
// @access  Private
exports.getAnalyticsReport = async (req, res) => {
  try {
    const range = req.query.range === 'daily' ? 'daily' : 'weekly';
    const days = range === 'daily' ? 1 : 7;
    const payload = await getAnalyticsPayload({ userId: req.user.id, days });

    res.status(200).json({
      success: true,
      data: {
        range,
        ...payload,
      }
    });
  } catch (err) {
    console.error('Analytics Report Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get printable analytics report HTML
// @route   GET /api/analytics/report/print
// @access  Private
exports.getPrintableAnalyticsReport = async (req, res) => {
  try {
    const range = req.query.range === 'daily' ? 'daily' : 'weekly';
    const days = range === 'daily' ? 1 : 7;
    const payload = await getAnalyticsPayload({ userId: req.user.id, days });
    const rangeLabel = range === 'daily' ? 'Daily' : 'Weekly';
    const html = buildPrintableReportHtml({
      user: req.user,
      rangeLabel,
      payload,
    });

    res.status(200).json({
      success: true,
      data: {
        range,
        html,
        fileName: `tracksphere-${range}-report.html`,
      }
    });
  } catch (err) {
    console.error('Printable Analytics Report Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
