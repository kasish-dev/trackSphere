const reportService = require('../services/reportService');
const User = require('../models/User');
const Workspace = require('../models/Workspace');

const canAccessWorkspace = (actor, workspaceId) => {
  if (actor.role === 'superadmin') {
    return true;
  }

  const actorWorkspaceId = actor.workspace?._id?.toString?.() || actor.workspace?.toString?.() || '';
  return actorWorkspaceId === String(workspaceId);
};

// Generate and send daily report
exports.generateDailyReport = async (req, res) => {
  try {
    const { workspaceId, date } = req.body;

    const user = await User.findById(req.user.id).populate('workspace', 'name');
    if (!canAccessWorkspace(user, workspaceId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const reportData = await reportService.generateDailyReport(workspaceId, date ? new Date(date) : null);
    res.json(reportData);
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send report via email
exports.sendReportEmail = async (req, res) => {
  try {
    const { workspaceId, date, recipients } = req.body;

    const user = await User.findById(req.user.id).populate('workspace', 'name');
    if (!canAccessWorkspace(user, workspaceId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const reportData = await reportService.generateDailyReport(workspaceId, date ? new Date(date) : null);
    const result = await reportService.sendDailyReportEmail(reportData, recipients);

    res.json({ message: 'Report sent successfully', messageId: result.messageId });
  } catch (error) {
    console.error('Error sending report email:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get report preview (HTML)
exports.getReportPreview = async (req, res) => {
  try {
    const { workspaceId, date } = req.query;

    const user = await User.findById(req.user.id).populate('workspace', 'name');
    if (!canAccessWorkspace(user, workspaceId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const reportData = await reportService.generateDailyReport(workspaceId, date ? new Date(date) : null);
    const htmlContent = reportService.generateHTMLReport(reportData);

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (error) {
    console.error('Error generating report preview:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateReportSettings = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const user = await User.findById(req.user.id).populate('workspace', 'name');

    if (!canAccessWorkspace(user, workspaceId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const recipients = Array.isArray(req.body.recipients)
      ? req.body.recipients.map((value) => String(value || '').trim()).filter(Boolean)
      : workspace.reportSettings?.recipients || [];

    workspace.reportSettings = {
      ...workspace.reportSettings,
      ...req.body,
      recipients,
    };

    await workspace.save();

    res.json({
      success: true,
      data: workspace.reportSettings,
    });
  } catch (error) {
    console.error('Error updating report settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
