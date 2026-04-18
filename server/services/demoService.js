const User = require('../models/User');
const Group = require('../models/Group');
const LocationHistory = require('../models/LocationHistory');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcryptjs');

// Demo user credentials
const DEMO_USER = {
  email: 'demo@ksynq.com',
  password: '123456',
  name: 'Demo User',
};

// Demo data
const DEMO_USERS = [
  { name: 'John Smith', email: 'john@demo.com', role: 'user' },
  { name: 'Sarah Johnson', email: 'sarah@demo.com', role: 'user' },
  { name: 'Mike Davis', email: 'mike@demo.com', role: 'user' },
  { name: 'Emma Wilson', email: 'emma@demo.com', role: 'user' },
  { name: 'Alex Brown', email: 'alex@demo.com', role: 'user' },
];

const DEMO_LOCATIONS = [
  // Bangalore office coordinates
  { lat: 12.9716, lng: 77.5946, name: 'Ksynq HQ' },
  { lat: 12.9783, lng: 77.6408, name: 'Tech Park' },
  { lat: 12.9822, lng: 77.6036, name: 'Business District' },
  { lat: 12.9592, lng: 77.5778, name: 'Residential Area' },
];

class DemoService {
  // Create demo user if it doesn't exist
  async ensureDemoUser() {
    try {
      let demoUser = await User.findOne({ email: DEMO_USER.email });

      if (!demoUser) {
        const hashedPassword = await bcrypt.hash(DEMO_USER.password, 10);

        demoUser = new User({
          name: DEMO_USER.name,
          email: DEMO_USER.email,
          password: hashedPassword,
          role: 'admin',
          subscriptionTier: 'ENTERPRISE', // Give demo user full access
          trialStatus: 'active',
          accountType: 'business_owner',
        });

        await demoUser.save();
        console.log('Demo user created:', demoUser.email);
      }

      return demoUser;
    } catch (error) {
      console.error('Error creating demo user:', error);
      throw error;
    }
  }

  // Populate demo data for the demo user
  async populateDemoData(demoUserId) {
    try {
      // Create demo workspace if it doesn't exist
      let workspace = await require('../models/Workspace').findOne({ owner: demoUserId });

      if (!workspace) {
        workspace = new (require('../models/Workspace'))({
          name: 'Ksynq Demo Company',
          slug: 'ksynq-demo',
          inviteCode: 'DEMO123',
          owner: demoUserId,
        });
        await workspace.save();

        // Update demo user with workspace
        await User.findByIdAndUpdate(demoUserId, { workspace: workspace._id });
      }

      // Create demo employees
      const demoEmployees = [];
      for (const employeeData of DEMO_USERS) {
        let employee = await User.findOne({ email: employeeData.email });

        if (!employee) {
          const hashedPassword = await bcrypt.hash('demo123', 10);

          employee = new User({
            name: employeeData.name,
            email: employeeData.email,
            password: hashedPassword,
            role: employeeData.role,
            workspace: workspace._id,
            subscriptionTier: 'FREE',
            accountType: 'employee',
          });

          await employee.save();
          demoEmployees.push(employee);
        } else {
          demoEmployees.push(employee);
        }
      }

      // Create demo group
      let demoGroup = await Group.findOne({ name: 'Demo Team', owner: demoUserId });

      if (!demoGroup) {
        demoGroup = new Group({
          name: 'Demo Team',
          owner: demoUserId,
          members: demoEmployees.map(emp => emp._id),
        });
        await demoGroup.save();
      }

      // Generate demo location history for the past 7 days
      await this.generateDemoLocationHistory(demoEmployees, demoGroup._id);

      // Generate demo attendance records
      await this.generateDemoAttendance(demoEmployees, workspace._id);

      console.log('Demo data populated successfully');
      return { workspace, employees: demoEmployees, group: demoGroup };
    } catch (error) {
      console.error('Error populating demo data:', error);
      throw error;
    }
  }

  // Generate fake location history
  async generateDemoLocationHistory(users, groupId) {
    const locations = [];

    for (let day = 6; day >= 0; day--) {
      const date = new Date();
      date.setDate(date.getDate() - day);

      for (const user of users) {
        // Generate 8-12 location points per day (work hours)
        const pointsPerDay = Math.floor(Math.random() * 5) + 8;

        for (let i = 0; i < pointsPerDay; i++) {
          const hour = 9 + Math.floor(i * 8 / pointsPerDay); // 9 AM to 5 PM
          const minute = Math.floor(Math.random() * 60);

          const locationDate = new Date(date);
          locationDate.setHours(hour, minute, 0, 0);

          // Pick a random demo location
          const randomLocation = DEMO_LOCATIONS[Math.floor(Math.random() * DEMO_LOCATIONS.length)];

          locations.push({
            user: user._id,
            group: groupId,
            lat: randomLocation.lat + (Math.random() - 0.5) * 0.01, // Add some variation
            lng: randomLocation.lng + (Math.random() - 0.5) * 0.01,
            accuracy: Math.floor(Math.random() * 20) + 5,
            timestamp: locationDate,
            batteryLevel: Math.random() * 0.3 + 0.7, // 70-100%
            isCharging: Math.random() > 0.8,
          });
        }
      }
    }

    if (locations.length > 0) {
      await LocationHistory.insertMany(locations);
      console.log(`Generated ${locations.length} demo location points`);
    }
  }

  // Generate demo attendance records
  async generateDemoAttendance(users, workspaceId) {
    const attendanceRecords = [];

    for (let day = 6; day >= 0; day--) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const dateKey = date.toISOString().split('T')[0];

      for (const user of users) {
        // Random attendance status
        const rand = Math.random();
        let status = 'present';
        let checkInTime = null;
        let checkOutTime = null;

        if (rand < 0.8) { // 80% present
          status = 'present';
          const checkInHour = 8 + Math.floor(Math.random() * 3); // 8-10 AM
          const checkInMinute = Math.floor(Math.random() * 60);
          checkInTime = new Date(date);
          checkInTime.setHours(checkInHour, checkInMinute, 0, 0);

          const workHours = 7 + Math.random() * 3; // 7-10 hours
          checkOutTime = new Date(checkInTime.getTime() + workHours * 60 * 60 * 1000);
        } else if (rand < 0.9) { // 10% late
          status = 'late';
          const checkInHour = 10 + Math.floor(Math.random() * 2); // 10-11 AM
          const checkInMinute = Math.floor(Math.random() * 60);
          checkInTime = new Date(date);
          checkInTime.setHours(checkInHour, checkInMinute, 0, 0);

          checkOutTime = new Date(checkInTime.getTime() + (6 + Math.random() * 2) * 60 * 60 * 1000);
        } else { // 10% absent
          status = 'absent';
        }

        attendanceRecords.push({
          user: user._id,
          workspace: workspaceId,
          date: date,
          dateKey: dateKey,
          checkInTime: checkInTime,
          checkOutTime: checkOutTime,
          status: status,
          autoGenerated: false,
          notes: 'Demo data',
        });
      }
    }

    if (attendanceRecords.length > 0) {
      await Attendance.insertMany(attendanceRecords);
      console.log(`Generated ${attendanceRecords.length} demo attendance records`);
    }
  }

  // Clean up demo data (for testing)
  async cleanupDemoData() {
    try {
      const demoUser = await User.findOne({ email: DEMO_USER.email });
      if (!demoUser) return;

      // Remove demo employees
      await User.deleteMany({ workspace: demoUser.workspace });

      // Remove demo workspace
      await require('../models/Workspace').deleteMany({ owner: demoUser._id });

      // Remove demo user
      await User.deleteOne({ _id: demoUser._id });

      console.log('Demo data cleaned up');
    } catch (error) {
      console.error('Error cleaning up demo data:', error);
    }
  }

  // Check if user is demo user
  isDemoUser(user) {
    return user && user.email === DEMO_USER.email;
  }

  // Get demo credentials
  getDemoCredentials() {
    return {
      email: DEMO_USER.email,
      password: DEMO_USER.password,
    };
  }
}

module.exports = new DemoService();