const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Geofence = require('../models/Geofence');
const Workspace = require('../models/Workspace');

const getDateKey = (value = new Date()) => new Date(value).toISOString().split('T')[0];

const getWorkspaceAttendanceSettings = (workspace) => ({
  autoAttendanceEnabled: workspace?.attendanceSettings?.autoAttendanceEnabled ?? true,
  expectedCheckInTime: workspace?.attendanceSettings?.expectedCheckInTime || '09:00',
  expectedCheckOutTime: workspace?.attendanceSettings?.expectedCheckOutTime || '18:00',
  fullDayHours: workspace?.attendanceSettings?.fullDayHours ?? 8,
  halfDayHours: workspace?.attendanceSettings?.halfDayHours ?? 4,
  lateAfterMinutes: workspace?.attendanceSettings?.lateAfterMinutes ?? 0,
  geofenceCategories: (workspace?.attendanceSettings?.geofenceCategories || ['work', 'office', 'headquarters'])
    .map((category) => category.toLowerCase()),
});

const buildExpectedDate = (baseDate, timeString) => {
  const target = new Date(baseDate);
  const [hours, minutes] = (timeString || '09:00').split(':').map(Number);
  target.setHours(hours || 0, minutes || 0, 0, 0);
  return target;
};

const getAttendanceStatus = ({ checkInTime, checkOutTime, expectedCheckInTime, lateAfterMinutes, fullDayHours, halfDayHours }) => {
  const expectedCheckInDate = buildExpectedDate(checkInTime || new Date(), expectedCheckInTime);
  const lateThreshold = new Date(expectedCheckInDate.getTime() + (lateAfterMinutes * 60 * 1000));
  const isLate = Boolean(checkInTime && checkInTime > lateThreshold);
  const lateMinutes = isLate ? Math.round((checkInTime - expectedCheckInDate) / (1000 * 60)) : 0;
  const totalHours = checkInTime && checkOutTime
    ? Math.round((((checkOutTime - checkInTime) / (1000 * 60 * 60)) * 100)) / 100
    : 0;

  let status = 'absent';
  if (checkInTime && !checkOutTime) {
    status = isLate ? 'late' : 'present';
  } else if (checkInTime && checkOutTime) {
    if (totalHours >= fullDayHours) {
      status = isLate ? 'late' : 'present';
    } else if (totalHours >= halfDayHours) {
      status = 'half-day';
    } else {
      status = 'incomplete';
    }
  }

  return {
    status,
    totalHours,
    isLate,
    lateMinutes,
    expectedCheckInDate,
  };
};

class AttendanceService {
  // Auto check-in when user enters office geofence
  async handleGeofenceEntry(userId, geofenceId, entryTime, location) {
    try {
      const geofence = await Geofence.findById(geofenceId);
      const user = await User.findById(userId);
      if (!user) return;
      const workspace = await Workspace.findById(user.workspace);
      const settings = getWorkspaceAttendanceSettings(workspace);

      if (!settings.autoAttendanceEnabled) {
        return;
      }

      if (!geofence || !settings.geofenceCategories.includes((geofence.category || '').toLowerCase())) {
        return;
      }

      const actualEntryTime = entryTime ? new Date(entryTime) : new Date();
      const dateKey = getDateKey(actualEntryTime);

      let attendance = await Attendance.findOne({
        user: userId,
        dateKey,
      });

      const computed = getAttendanceStatus({
        checkInTime: actualEntryTime,
        checkOutTime: attendance?.checkOutTime || null,
        expectedCheckInTime: settings.expectedCheckInTime,
        lateAfterMinutes: settings.lateAfterMinutes,
        fullDayHours: settings.fullDayHours,
        halfDayHours: settings.halfDayHours,
      });

      if (!attendance) {
        attendance = new Attendance({
          user: userId,
          workspace: user.workspace,
          date: actualEntryTime,
          dateKey,
          checkInTime: actualEntryTime,
          checkInLocation: location,
          geofenceId,
          expectedCheckInTime: settings.expectedCheckInTime,
          expectedCheckOutTime: settings.expectedCheckOutTime,
          status: computed.status,
          isLate: computed.isLate,
          lateMinutes: computed.lateMinutes,
        });
      } else if (!attendance.checkInTime) {
        attendance.checkInTime = actualEntryTime;
        attendance.checkInLocation = location;
        attendance.geofenceId = geofenceId;
        attendance.expectedCheckInTime = settings.expectedCheckInTime;
        attendance.expectedCheckOutTime = settings.expectedCheckOutTime;
        attendance.status = computed.status;
        attendance.isLate = computed.isLate;
        attendance.lateMinutes = computed.lateMinutes;
      }

      await attendance.save();
      return attendance;
    } catch (error) {
      console.error('Error handling geofence entry for attendance:', error);
    }
  }

  // Auto check-out when user leaves office geofence
  async handleGeofenceExit(userId, geofenceId, exitTime, location) {
    try {
      const geofence = await Geofence.findById(geofenceId);
      const user = await User.findById(userId);
      if (!user) return;
      const workspace = await Workspace.findById(user.workspace);
      const settings = getWorkspaceAttendanceSettings(workspace);

      if (!settings.autoAttendanceEnabled) {
        return;
      }

      if (!geofence || !settings.geofenceCategories.includes((geofence.category || '').toLowerCase())) {
        return;
      }

      const actualExitTime = exitTime ? new Date(exitTime) : new Date();
      const dateKey = getDateKey(actualExitTime);

      const attendance = await Attendance.findOne({
        user: userId,
        dateKey,
        checkInTime: { $ne: null },
        checkOutTime: null,
      });

      if (attendance) {
        const computed = getAttendanceStatus({
          checkInTime: attendance.checkInTime,
          checkOutTime: actualExitTime,
          expectedCheckInTime: attendance.expectedCheckInTime || settings.expectedCheckInTime,
          lateAfterMinutes: settings.lateAfterMinutes,
          fullDayHours: settings.fullDayHours,
          halfDayHours: settings.halfDayHours,
        });

        attendance.checkOutTime = actualExitTime;
        attendance.checkOutLocation = location;
        attendance.totalHours = computed.totalHours;
        attendance.status = computed.status;
        attendance.isLate = computed.isLate;
        attendance.lateMinutes = computed.lateMinutes;

        await attendance.save();
        return attendance;
      }
    } catch (error) {
      console.error('Error handling geofence exit for attendance:', error);
    }
  }

  // Get attendance records for a user
  async getUserAttendance(userId, startDate, endDate) {
    try {
      const query = { user: userId };

      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      return await Attendance.find(query)
        .populate('geofenceId', 'name category')
        .sort({ date: -1 });
    } catch (error) {
      console.error('Error fetching user attendance:', error);
      throw error;
    }
  }

  // Get attendance summary for a workspace
  async getWorkspaceAttendanceSummary(workspaceId, date) {
    try {
      const targetDate = date || new Date();
      const dateKey = targetDate.toISOString().split('T')[0];

      const attendanceRecords = await Attendance.find({
        workspace: workspaceId,
        dateKey: dateKey,
      }).populate('user', 'name email');

      const summary = {
        date: targetDate,
        totalEmployees: 0,
        present: 0,
        late: 0,
        absent: 0,
        halfDay: 0,
        incomplete: 0,
        records: attendanceRecords,
      };

      // Get total employees in workspace
      const User = require('../models/User');
      const totalEmployees = await User.countDocuments({
        workspace: workspaceId,
        role: { $ne: 'superadmin' },
      });

      summary.totalEmployees = totalEmployees;

      attendanceRecords.forEach(record => {
        switch (record.status) {
          case 'present':
            summary.present++;
            break;
          case 'late':
            summary.late++;
            break;
          case 'absent':
            summary.absent++;
            break;
          case 'half-day':
            summary.halfDay++;
            break;
          case 'incomplete':
            summary.incomplete++;
            break;
        }
      });

      summary.absent = Math.max(0, totalEmployees - (summary.present + summary.late + summary.halfDay + summary.incomplete));

      return summary;
    } catch (error) {
      console.error('Error fetching workspace attendance summary:', error);
      throw error;
    }
  }

  // Mark absent employees for a date
  async markAbsenteesForDate(workspaceId, date) {
    try {
      const targetDate = date || new Date();
      const dateKey = targetDate.toISOString().split('T')[0];

      // Get all users in workspace
      const users = await User.find({
        workspace: workspaceId,
        role: { $ne: 'superadmin' },
      });

      const absentRecords = [];

      for (const user of users) {
        // Check if attendance record exists
        const existingRecord = await Attendance.findOne({
          user: user._id,
          dateKey: dateKey,
        });

        if (!existingRecord) {
          // Create absent record
          const absentRecord = new Attendance({
            user: user._id,
            workspace: workspaceId,
            date: targetDate,
            dateKey: dateKey,
            status: 'absent',
            autoGenerated: true,
          });

          await absentRecord.save();
          absentRecords.push(absentRecord);
        }
      }

      return absentRecords;
    } catch (error) {
      console.error('Error marking absentees:', error);
      throw error;
    }
  }

  // Update attendance settings for a workspace
  async updateWorkspaceAttendanceSettings(workspaceId, settings) {
    try {
      // This could be stored in Workspace model or a separate AttendanceSettings model
      // For now, we'll use a simple approach
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      workspace.attendanceSettings = {
        ...workspace.attendanceSettings,
        ...settings,
      };

      await workspace.save();
      return workspace.attendanceSettings;
    } catch (error) {
      console.error('Error updating attendance settings:', error);
      throw error;
    }
  }
}

module.exports = new AttendanceService();
