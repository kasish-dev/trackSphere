import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Users,
  Shield,
  Zap,
  Crown,
  Search,
  ArrowUpRight,
  TrendingUp,
  BellRing,
  Activity,
  Clock3,
  Layers3,
  Receipt,
  XCircle,
  BriefcaseBusiness,
  Map,
  Loader2,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  UserX
} from 'lucide-react';
import { motion } from 'framer-motion';

const Admin = () => {
  const { user } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [promotingUserId, setPromotingUserId] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalGroups: 0,
    proUsers: 0,
    businessUsers: 0,
    enterpriseUsers: 0,
    trialUsers: 0,
    estimatedMonthlyRevenue: 0,
    unreadAlerts: 0,
    safetyAlerts: 0,
    totalRevenueCollected: 0,
    monthlyRevenueCollected: 0,
    successfulPayments: 0,
    failedPayments: 0,
  });
  const [attendance, setAttendance] = useState({
    totalSessions: 0,
    openSessions: 0,
    closedSessions: 0,
    totalWorkHours: 0,
    avgWorkHours: 0,
    totalDistanceKm: 0,
    totalPings: 0,
    sessions: [],
  });

  // Live monitoring state
  const [liveUsers, setLiveUsers] = useState([]);
  const [liveAttendance, setLiveAttendance] = useState({
    present: 0,
    late: 0,
    absent: 0,
    totalEmployees: 0,
  });
  const [sosAlerts, setSosAlerts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const socketRef = useRef(null);

  useEffect(() => {
    fetchDashboard();
    setupLiveMonitoring();
    fetchLiveData();

    // Set up periodic updates
    const interval = setInterval(() => {
      fetchLiveData();
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const setupLiveMonitoring = () => {
    // This would connect to socket for real-time updates
    // For now, we'll use polling
    console.log('Setting up live monitoring...');
  };

  const fetchLiveData = async () => {
    try {
      const locationResponse = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/location/live-users`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      if (locationResponse.data?.users) {
        setLiveUsers(locationResponse.data.users);
      }

      if (locationResponse.data?.summary) {
        setLiveAttendance((prev) => ({
          ...prev,
          totalEmployees: locationResponse.data.summary.totalUsers || 0,
          absent: locationResponse.data.summary.inactiveUsers || 0,
        }));
      }

      // Fetch recent SOS alerts
      const sosResponse = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications?sos=true&limit=5`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      if (sosResponse.data?.notifications) {
        setSosAlerts(sosResponse.data.notifications);
      }

    } catch (error) {
      console.error('Error fetching live data:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/dashboard`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setUsers(data.data?.users || []);
      setStats(data.data?.stats || {});
      setAttendance(data.data?.attendance || {});
      setLiveAttendance((prev) => ({
        ...prev,
        present: data.data?.attendance?.openSessions || 0,
        late: prev.late || 0,
      }));
    } catch (err) {
      console.error('Fetch admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'PRO':
        return <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border border-blue-200"><Zap size={12} /> Pro</span>;
      case 'BUSINESS':
        return <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border border-purple-200"><Crown size={12} /> Business</span>;
      case 'ENTERPRISE':
        return <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border border-indigo-200"><Shield size={12} /> Enterprise</span>;
      default:
        return <span className="inline-flex items-center bg-gray-50 text-gray-600 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border border-gray-200">Free</span>;
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const promoteToAdmin = async (targetUser) => {
    try {
      setPromotingUserId(targetUser.id);
      await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/users/${targetUser.id}/promote-admin`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setUsers((prevUsers) => prevUsers.map((existingUser) => (
        existingUser.id === targetUser.id
          ? { ...existingUser, role: 'admin', accountType: existingUser.accountType === 'individual' ? 'business_owner' : existingUser.accountType }
          : existingUser
      )));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to promote user');
    } finally {
      setPromotingUserId('');
    }
  };

  const overviewCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users },
    { label: 'Active Users (24h)', value: stats.activeUsers, icon: Activity },
    { label: 'Total Groups', value: stats.totalGroups, icon: Layers3 },
    { label: 'Estimated MRR', value: `Rs ${Number(stats.estimatedMonthlyRevenue || 0).toLocaleString()}`, icon: TrendingUp },
  ];

  const financialCards = [
    { label: 'Revenue Collected', value: `Rs ${Number(stats.totalRevenueCollected || 0).toLocaleString()}`, icon: Receipt },
    { label: 'Collected This Month', value: `Rs ${Number(stats.monthlyRevenueCollected || 0).toLocaleString()}`, icon: Receipt },
    { label: 'Successful Payments', value: stats.successfulPayments, icon: ArrowUpRight },
    { label: 'Failed Payments', value: stats.failedPayments, icon: XCircle, color: 'text-red-600' },
  ];

  return (
    <div className="max-w-[90rem]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor high-level metrics, revenue, and platform usage.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="w-72 bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 tracking-wide uppercase">Core Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {overviewCards.map((card, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              key={card.label}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</p>
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">
                  <card.icon size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight mt-auto">{card.value ?? 0}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 tracking-wide uppercase">Financial Integrity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {financialCards.map((card, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 + 0.2, duration: 0.3 }}
              key={card.label}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</p>
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">
                  <card.icon size={16} className={card.color || 'text-gray-500'} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight mt-auto">{card.value ?? 0}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Live Monitoring Dashboard */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 tracking-wide uppercase">Live Monitoring</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Users</p>
              <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                <Eye size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{liveUsers.length}</p>
            <p className="text-xs text-gray-500 mt-1">Currently online</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Present Today</p>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <UserCheck size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{liveAttendance.present}</p>
            <p className="text-xs text-gray-500 mt-1">Checked in</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Late Arrivals</p>
              <div className="w-8 h-8 rounded-lg bg-yellow-50 border border-yellow-100 flex items-center justify-center text-yellow-600">
                <Clock3 size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{liveAttendance.late}</p>
            <p className="text-xs text-gray-500 mt-1">Arrived late</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">SOS Alerts</p>
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{sosAlerts.length}</p>
            <p className="text-xs text-gray-500 mt-1">Active alerts</p>
          </motion.div>
        </div>

        {/* Live Map and Activity Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Live User Map */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Map size={16} className="text-gray-400" />
                Live User Locations
              </h3>
            </div>
            <div className="p-5">
              {liveUsers.length > 0 ? (
                <div className="space-y-3">
                  {liveUsers.slice(0, 8).map((user, index) => (
                    <motion.div
                      key={user.id || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary-700">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500">
                            {user.lat?.toFixed(4)}, {user.lng?.toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs text-gray-500">Live</span>
                      </div>
                    </motion.div>
                  ))}
                  {liveUsers.length > 8 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      +{liveUsers.length - 8} more users active
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Map size={48} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No active users currently</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent SOS Alerts */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" />
                Recent SOS Alerts
              </h3>
            </div>
            <div className="p-5">
              {sosAlerts.length > 0 ? (
                <div className="space-y-3">
                  {sosAlerts.map((alert, index) => (
                    <motion.div
                      key={alert._id || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg"
                    >
                      <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">{alert.message}</p>
                        <p className="text-xs text-red-600 mt-1">
                          {new Date(alert.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle size={48} className="text-green-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No active SOS alerts</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & User Management Split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Attendance & Readout */}
        <div className="xl:col-span-1 space-y-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <BriefcaseBusiness size={16} className="text-gray-400" />
                Global Attendance Pulse
              </h2>
            </div>
            
            <div className="p-5 flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Sessions</p>
                  <p className="text-xl font-bold text-gray-900">{attendance.totalSessions}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Open Sessions</p>
                  <p className="text-xl font-bold text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {attendance.openSessions}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Work Hours Recorded</p>
                  <p className="text-xl font-bold text-gray-900">{attendance.totalWorkHours}h</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Pings Logged</p>
                  <p className="text-xl font-bold text-gray-900">{attendance.totalPings}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">Live Activity</p>
                <div className="space-y-3">
                  {attendance.sessions?.slice(0, 4).map((session) => (
                    <div key={session.id} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-gray-900">{session.userName}</p>
                        <p className="text-xs text-gray-500">{session.status === 'Active' ? 'Working' : 'Completed'}</p>
                      </div>
                      <span className="font-semibold text-gray-700">{session.workHours}h</span>
                    </div>
                  ))}
                  {(!attendance.sessions || attendance.sessions.length === 0) && (
                    <p className="text-xs text-gray-400">No active sessions at the moment.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: User Directory */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Account Directory</h2>
                <p className="text-xs text-gray-500 mt-0.5">Manage user roles and subscription tiers.</p>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FAFAFA] border-b border-gray-200 text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 whitespace-nowrap">User</th>
                    <th className="px-5 py-3 whitespace-nowrap">Role Status</th>
                    <th className="px-5 py-3 whitespace-nowrap">Billing Plan</th>
                    <th className="px-5 py-3 whitespace-nowrap">Joined Date</th>
                    <th className="px-5 py-3 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-8 text-center text-sm text-gray-400 font-medium">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-gray-300" />
                        Fetching directory...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-8 text-center text-sm text-gray-400 font-medium">
                        No users found matching your search.
                      </td>
                    </tr>
                  ) : filteredUsers.map((u) => (
                    <tr key={u.id || u._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs uppercase">
                            {u.name?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.role === 'admin' || u.role === 'superadmin' ? (
                          <span className="inline-flex items-center bg-gray-900 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            {u.role}
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            Employee
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          {getTierBadge(u.subscriptionTier)}
                          {u.trialStatus === 'active' && (
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                              Active Trial
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {u.role === 'user' && (
                          <button
                            onClick={() => promoteToAdmin(u)}
                            disabled={promotingUserId === u.id}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 shadow-sm"
                          >
                            {promotingUserId === u.id ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} className="text-gray-400" />}
                            Make Admin
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
