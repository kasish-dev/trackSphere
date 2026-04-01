import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Users,
  Shield,
  Zap,
  Crown,
  Search,
  MoreVertical,
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

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/dashboard`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setUsers(data.data?.users || []);
      setStats(data.data?.stats || {});
      setAttendance(data.data?.attendance || {});
    } catch (err) {
      console.error('Fetch admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'PRO':
        return <span className="bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-xs font-bold border border-primary-100 flex items-center gap-1 w-fit"><Zap size={12} /> PRO</span>;
      case 'BUSINESS':
        return <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs font-bold border border-purple-100 flex items-center gap-1 w-fit"><Crown size={12} /> BUSINESS</span>;
      case 'ENTERPRISE':
        return <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold border border-amber-100 flex items-center gap-1 w-fit"><Shield size={12} /> ENTERPRISE</span>;
      default:
        return <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-full text-xs font-bold border border-gray-100 w-fit text-center">FREE</span>;
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

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, style: 'bg-blue-50 text-blue-600' },
    { label: 'Active Users (24h)', value: stats.activeUsers, icon: Activity, style: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Groups', value: stats.totalGroups, icon: Layers3, style: 'bg-indigo-50 text-indigo-600' },
    { label: 'Est. Monthly Revenue', value: `Rs ${Number(stats.estimatedMonthlyRevenue || 0).toLocaleString()}`, icon: TrendingUp, style: 'bg-green-50 text-green-600' },
    { label: 'Trial Users', value: stats.trialUsers, icon: Clock3, style: 'bg-amber-50 text-amber-600' },
    { label: 'Pro Users', value: stats.proUsers, icon: Zap, style: 'bg-primary-50 text-primary-600' },
    { label: 'Business Users', value: stats.businessUsers, icon: Crown, style: 'bg-purple-50 text-purple-600' },
    { label: 'Unread Alerts', value: stats.unreadAlerts, icon: BellRing, style: 'bg-rose-50 text-rose-600' },
    { label: 'Revenue Collected', value: `Rs ${Number(stats.totalRevenueCollected || 0).toLocaleString()}`, icon: Receipt, style: 'bg-cyan-50 text-cyan-600' },
    { label: 'This Month Collected', value: `Rs ${Number(stats.monthlyRevenueCollected || 0).toLocaleString()}`, icon: Receipt, style: 'bg-sky-50 text-sky-600' },
    { label: 'Successful Payments', value: stats.successfulPayments, icon: Receipt, style: 'bg-lime-50 text-lime-600' },
    { label: 'Failed Payments', value: stats.failedPayments, icon: XCircle, style: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="text-primary-600" size={32} />
            System Administration
          </h1>
          <p className="text-gray-500 font-medium">Track users, trial adoption, business growth, and platform activity.</p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <Search className="text-gray-400 ml-2" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            className="bg-transparent border-none focus:ring-0 text-sm w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {cards.map((card, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            key={card.label}
            className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm"
          >
            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center ${card.style}`}>
              <card.icon size={24} />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{card.value ?? 0}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-black text-lg flex items-center gap-2">
              <BriefcaseBusiness size={20} className="text-primary-600" />
              Attendance Analytics
            </h2>
            <p className="text-sm text-gray-500 mt-1">Today&apos;s employee tracking summary and open work sessions.</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Today Sessions', value: attendance.totalSessions, icon: BriefcaseBusiness, style: 'bg-primary-50 text-primary-600' },
            { label: 'Open Sessions', value: attendance.openSessions, icon: Activity, style: 'bg-emerald-50 text-emerald-600' },
            { label: 'Total Work Hours', value: `${attendance.totalWorkHours || 0}h`, icon: Clock3, style: 'bg-amber-50 text-amber-600' },
            { label: 'Distance Logged', value: `${attendance.totalDistanceKm || 0} km`, icon: Map, style: 'bg-indigo-50 text-indigo-600' },
          ].map((card) => (
            <div key={card.label} className="rounded-[1.5rem] border border-gray-100 dark:border-gray-700 p-5">
              <div className={`w-10 h-10 rounded-2xl mb-3 flex items-center justify-center ${card.style}`}>
                <card.icon size={18} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
          <div className="rounded-[1.5rem] border border-gray-100 dark:border-gray-700 p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Attendance Highlights</p>
            <div className="space-y-2 text-gray-600 dark:text-gray-300">
              <p>Average work hours: <span className="font-black text-gray-900 dark:text-white">{attendance.avgWorkHours || 0}h</span></p>
              <p>Closed sessions: <span className="font-black text-gray-900 dark:text-white">{attendance.closedSessions || 0}</span></p>
              <p>Total movement pings: <span className="font-black text-gray-900 dark:text-white">{attendance.totalPings || 0}</span></p>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-gray-100 dark:border-gray-700 p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Operational Readout</p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              TrackSphere is now recording auto check-in/check-out, work hours, and movement distance. This gives admins a demo-ready attendance layer on top of live location tracking.
            </p>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-[1.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40">
              <p className="font-black text-sm">Recent Work Sessions</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {attendance.sessions?.length ? attendance.sessions.map((session) => (
                <div key={session.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{session.userName}</p>
                    <p className="text-xs text-gray-500">{session.email}</p>
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                    <span>{session.status}</span>
                    <span>{session.workHours}h</span>
                    <span>{session.totalDistanceKm} km</span>
                    <span>{session.totalPings} pings</span>
                    <span>
                      In: {session.checkInAt ? new Date(session.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </span>
                    <span>
                      Out: {session.checkOutAt ? new Date(session.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Open'}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-6 text-sm text-gray-400">No work sessions recorded today yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-black text-lg">User Directory</h2>
            <p className="text-sm text-gray-500 mt-1">Includes trial status and current billing tier.</p>
          </div>
          <button className="text-primary-600 font-bold text-sm flex items-center gap-1 hover:underline">
            Export CSV <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-xs text-gray-400 font-bold uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700 font-medium">
              {loading ? (
                <tr><td colSpan="5" className="p-10 text-center text-gray-400">Loading system data...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="5" className="p-10 text-center text-gray-400">No users matched your search.</td></tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.id || u._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs">
                        {u.name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-bold">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                      u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {getTierBadge(u.subscriptionTier)}
                      {u.trialStatus === 'active' && (
                        <span className="inline-flex bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                          Trial Active
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</div>
                    {u.trialEndsAt && (
                      <div className="text-xs text-amber-600">
                        Trial ends {new Date(u.trialEndsAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-100">
                        Admin
                      </span>
                    ) : (
                      <button
                        onClick={() => promoteToAdmin(u)}
                        disabled={promotingUserId === u.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-primary-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-primary-700 hover:bg-primary-50 disabled:opacity-50"
                      >
                        {promotingUserId === u.id ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
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
  );
};

export default Admin;
