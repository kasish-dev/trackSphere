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
  const rows = payload.daily.map((day) => `
    <tr>
      <td>${day.date}</td>
      <td>${day.distance} km</td>
      <td>${day.battery}%</td>
      <td>${day.pings}</td>
    </tr>
  `).join('');

  const alertRows = payload.alerts.length
    ? payload.alerts.map((alert) => `<li>${alert._id}: ${alert.count}</li>`).join('')
    : '<li>No alerts in this period</li>';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>TrackSphere ${rangeLabel} Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
    h1, h2 { margin-bottom: 8px; }
    .meta, .cards { margin-bottom: 24px; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    th { background: #f9fafb; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <h1>TrackSphere ${rangeLabel} Report</h1>
  <div class="meta">
    <div><strong>User:</strong> ${user.name}</div>
    <div><strong>Email:</strong> ${user.email}</div>
    <div><strong>Generated:</strong> ${new Date(payload.summary.generatedAt).toLocaleString()}</div>
  </div>
  <div class="cards">
    <div class="card"><strong>Total Distance</strong><div>${payload.summary.totalDistance} km</div></div>
    <div class="card"><strong>Total Pings</strong><div>${payload.summary.totalPings}</div></div>
    <div class="card"><strong>Average Battery</strong><div>${payload.summary.averageBattery}%</div></div>
    <div class="card"><strong>Total Alerts</strong><div>${payload.summary.totalAlerts}</div></div>
  </div>
  <h2>Movement Summary</h2>
  <table>
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
  <h2>Safety Alerts</h2>
  <ul>${alertRows}</ul>
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
