const Attendance = require('../models/Attendance');
const LocationHistory = require('../models/LocationHistory');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const nodemailer = require('nodemailer');

const getDateKey = (value = new Date()) => new Date(value).toISOString().split('T')[0];

const getDayBounds = (value = new Date()) => {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const end = new Date(value);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Generate daily attendance report
exports.generateDailyReport = async (workspaceId, date) => {
  try {
    const targetDate = date ? new Date(date) : new Date();
    const dateKey = getDateKey(targetDate);
    const { start, end } = getDayBounds(targetDate);

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Get attendance summary
    const attendanceService = require('./attendanceService');
    const attendanceSummary = await attendanceService.getWorkspaceAttendanceSummary(workspaceId, targetDate);

    const users = await User.find({ workspace: workspaceId });
    const locationStats = [];
    const attendanceByUser = new Map(
      (attendanceSummary.records || []).map((record) => [String(record.user?._id || record.user), record])
    );

    for (const user of users) {
      const locations = await LocationHistory.find({
        user: user._id,
        timestamp: {
          $gte: start,
          $lte: end,
        },
      }).sort({ timestamp: 1 });

      let totalDistance = 0;
      for (let i = 1; i < locations.length; i++) {
        const dist = getDistance(
          locations[i - 1].lat, locations[i - 1].lng,
          locations[i].lat, locations[i].lng
        );
        totalDistance += dist;
      }

      let idleTime = 0;
      for (let i = 1; i < locations.length; i++) {
        const timeDiff = locations[i].timestamp - locations[i - 1].timestamp;
        if (timeDiff > 30 * 60 * 1000) {
          idleTime += timeDiff;
        }
      }

      const attendanceRecord = attendanceByUser.get(String(user._id));
      locationStats.push({
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        totalDistance: Math.round(totalDistance * 100) / 100,
        idleTimeMinutes: Math.round(idleTime / (60 * 1000)),
        workHours: attendanceRecord?.totalHours || 0,
        status: attendanceRecord?.status || 'absent',
        checkIn: attendanceRecord?.checkInTime || null,
        checkOut: attendanceRecord?.checkOutTime || null,
        locationCount: locations.length,
        firstLocation: locations[0] || null,
        lastLocation: locations[locations.length - 1] || null,
      });
    }

    const totals = locationStats.reduce((acc, stat) => {
      acc.totalDistance += stat.totalDistance || 0;
      acc.totalIdleMinutes += stat.idleTimeMinutes || 0;
      acc.totalWorkHours += stat.workHours || 0;
      return acc;
    }, { totalDistance: 0, totalIdleMinutes: 0, totalWorkHours: 0 });

    workspace.reportSettings = workspace.reportSettings || {};
    workspace.reportSettings.lastGeneratedAt = new Date();
    await workspace.save();

    return {
      workspace: {
        name: workspace.name,
        id: workspace.id,
        seatPriceMonthly: workspace.billing?.seatPriceMonthly || 50,
        currency: workspace.billing?.currency || 'INR',
      },
      date: targetDate,
      dateKey,
      attendance: attendanceSummary,
      locationStats: locationStats,
      delivery: {
        frequency: workspace.reportSettings.frequency || 'daily',
        deliveryChannels: workspace.reportSettings.deliveryChannels || ['email'],
        recipients: workspace.reportSettings.recipients || [],
      },
      totals: {
        totalDistance: Number(totals.totalDistance.toFixed(2)),
        totalIdleMinutes: totals.totalIdleMinutes,
        totalWorkHours: Number(totals.totalWorkHours.toFixed(2)),
      },
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error generating daily report:', error);
    throw error;
  }
};

// Generate HTML report content
exports.generateHTMLReport = (reportData) => {
  const { workspace, date, attendance, locationStats, totals, delivery } = reportData;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Daily Report - ${workspace.name}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .stats { display: flex; gap: 20px; margin-bottom: 20px; }
            .stat-card { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; flex: 1; }
            .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th, .table td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
            .table th { background: #f8f9fa; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Daily Report - ${workspace.name}</h1>
            <p>Date: ${date.toDateString()}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${attendance.totalEmployees}</div>
                <div>Total Employees</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${attendance.present}</div>
                <div>Present</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${attendance.late}</div>
                <div>Late</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${attendance.absent}</div>
                <div>Absent</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Number(totals?.totalWorkHours || 0).toFixed(2)}h</div>
                <div>Total Work Hours</div>
            </div>
        </div>

        <h2>Delivery Summary</h2>
        <p>Channels: ${(delivery?.deliveryChannels || ['email']).join(', ')} | Recipients: ${(delivery?.recipients || []).join(', ') || 'Not configured'}</p>

        <h2>Employee Movement Summary</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Work Hours</th>
                    <th>Distance (km)</th>
                    <th>Idle Time (min)</th>
                    <th>Locations</th>
                </tr>
            </thead>
            <tbody>
                ${locationStats.map(stat => `
                    <tr>
                        <td>${stat.userName}</td>
                        <td>${stat.status}</td>
                        <td>${stat.checkIn ? new Date(stat.checkIn).toLocaleTimeString() : '-'}</td>
                        <td>${stat.checkOut ? new Date(stat.checkOut).toLocaleTimeString() : '-'}</td>
                        <td>${stat.workHours}</td>
                        <td>${stat.totalDistance}</td>
                        <td>${stat.idleTimeMinutes}</td>
                        <td>${stat.locationCount}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
  `;
};

// Send daily report via email
exports.sendDailyReportEmail = async (reportData, recipients) => {
  try {
    const htmlContent = this.generateHTMLReport(reportData);

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: recipients.join(','),
      subject: `Daily Report - ${reportData.workspace.name} - ${reportData.date.toDateString()}`,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    await Workspace.findByIdAndUpdate(reportData.workspace.id, {
      $set: { 'reportSettings.lastSentAt': new Date() },
    });
    console.log('Daily report email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending daily report email:', error);
    throw error;
  }
};

// Schedule daily reports (to be called by a cron job)
exports.scheduleDailyReports = async () => {
  try {
    // Get all workspaces
    const workspaces = await Workspace.find({});

    for (const workspace of workspaces) {
      try {
        if (workspace.reportSettings?.enabled === false) {
          continue;
        }

        // Generate report for yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const reportData = await this.generateDailyReport(workspace._id, yesterday);

        const configuredRecipients = workspace.reportSettings?.recipients || [];
        if (configuredRecipients.length > 0) {
          await this.sendDailyReportEmail(reportData, configuredRecipients);
        }
      } catch (workspaceError) {
        console.error(`Error processing daily report for workspace ${workspace._id}:`, workspaceError);
      }
    }
  } catch (error) {
    console.error('Error in daily report scheduling:', error);
  }
};

// Helper function to calculate distance
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c / 1000; // km
};
