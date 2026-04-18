import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Users,
  Activity,
  Layers3,
  Receipt,
  BriefcaseBusiness,
  Clock3,
  Map,
  Loader2,
  Copy,
  RefreshCcw,
  Mail,
  UserPlus,
  Trash2,
  Edit,
  AlertTriangle,
  UserCheck,
  UserX,
  Send,
  ExternalLink,
  IndianRupee,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';

const WorkspaceAdmin = () => {
  const { user } = useSelector((state) => state.auth);
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const authConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${user?.token}` },
  }), [user?.token]);

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [attendance, setAttendance] = useState({
    totalSessions: 0,
    openSessions: 0,
    totalWorkHours: 0,
    totalDistanceKm: 0,
    sessions: [],
  });
  const [liveOverview, setLiveOverview] = useState({
    summary: {
      activeUsers: 0,
      inactiveUsers: 0,
      sosAlerts: 0,
      totalEmployees: 0,
    },
    attendance: {
      present: 0,
      late: 0,
      absent: 0,
      totalEmployees: 0,
    },
    liveUsers: [],
    sosAlerts: [],
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [reportRecipients, setReportRecipients] = useState('');
  const [reportSaving, setReportSaving] = useState(false);
  const [reportSending, setReportSending] = useState(false);
  const [reportPreviewing, setReportPreviewing] = useState(false);

  const trialEndsAt = user?.user?.trialEndsAt ? new Date(user.user.trialEndsAt) : null;
  const trialActive = user?.user?.trialStatus === 'active' && trialEndsAt && trialEndsAt > new Date();
  const trialExpired = user?.user?.trialStatus === 'expired';
  const trialDaysLeft = trialActive
    ? Math.max(1, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const parseRecipients = (value) => value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const fetchWorkspaceDashboard = async () => {
    try {
      const { data } = await axios.get(`${apiBase}/api/auth/workspace-dashboard`, authConfig);
      setWorkspace(data.data?.workspace || null);
      setUsers(data.data?.users || []);
      setStats(data.data?.stats || {});
      setAttendance(data.data?.attendance || {});
      setReportRecipients((data.data?.workspace?.reportSettings?.recipients || []).join(', '));
    } catch (err) {
      console.error('Fetch workspace admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveOverview = async () => {
    try {
      const { data } = await axios.get(`${apiBase}/api/auth/workspace-live-overview`, authConfig);
      setLiveOverview(data.data || {
        summary: {},
        attendance: {},
        liveUsers: [],
        sosAlerts: [],
      });
    } catch (err) {
      console.error('Fetch workspace live overview error:', err);
    }
  };

  useEffect(() => {
    if (!user?.token) {
      return;
    }

    fetchWorkspaceDashboard();
    fetchLiveOverview();

    const interval = setInterval(() => {
      fetchLiveOverview();
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.token]);

  const overviewCards = [
    { label: 'Company Users', value: stats.totalUsers || 0, icon: Users },
    { label: 'Live Now', value: liveOverview.summary?.activeUsers || 0, icon: Activity },
    { label: 'Groups', value: stats.totalGroups || 0, icon: Layers3 },
    { label: 'Present Today', value: liveOverview.attendance?.present || 0, icon: UserCheck },
    { label: 'Late Today', value: liveOverview.attendance?.late || 0, icon: Clock3 },
    { label: 'Est. Seat Billing', value: `Rs ${Number(stats.estimatedSeatRevenue || 0).toLocaleString()}`, icon: IndianRupee },
  ];

  const copyInviteCode = async () => {
    if (!workspace?.inviteCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(workspace.inviteCode);
      alert('Workspace invite code copied.');
    } catch (error) {
      alert('Could not copy invite code on this device/browser.');
    }
  };

  const regenerateInviteCode = async () => {
    try {
      setRegeneratingCode(true);
      const { data } = await axios.post(
        `${apiBase}/api/auth/workspace/invite-code/regenerate`,
        {},
        authConfig
      );

      setWorkspace((prev) => ({
        ...(prev || {}),
        inviteCode: data.data?.inviteCode || prev?.inviteCode,
      }));
      alert('Workspace invite code regenerated.');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to regenerate invite code');
    } finally {
      setRegeneratingCode(false);
    }
  };

  const sendEmailInvite = async () => {
    if (!inviteEmail.trim() || !workspace?.inviteCode) {
      alert('Enter an email address first.');
      return;
    }

    try {
      await axios.post(
        `${apiBase}/api/auth/workspace/invite-email`,
        { email: inviteEmail.trim() },
        authConfig
      );
      alert('Invite email sent successfully.');
      setInviteEmail('');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to send invite email.');
    }
  };

  const deleteEmployee = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await axios.delete(`${apiBase}/api/auth/workspace/employees/${id}`, authConfig);
      await fetchWorkspaceDashboard();
      await fetchLiveOverview();
      alert('Employee deleted.');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete employee.');
    }
  };

  const confirmEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(
        `${apiBase}/api/auth/workspace/employees/${editingUser.id}`,
        { name: editingUser.name, role: editingUser.role },
        authConfig
      );
      setEditingUser(null);
      await fetchWorkspaceDashboard();
      await fetchLiveOverview();
      alert('Employee updated.');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update employee.');
    }
  };

  const createEmployee = async (e) => {
    e.preventDefault();

    if (!newEmployee.name.trim() || !newEmployee.email.trim() || !newEmployee.password.trim()) {
      alert('Fill in employee name, email, and password.');
      return;
    }

    try {
      setCreatingEmployee(true);
      await axios.post(`${apiBase}/api/auth/workspace/employees`, newEmployee, authConfig);
      setNewEmployee({ name: '', email: '', password: '' });
      await fetchWorkspaceDashboard();
      await fetchLiveOverview();
      alert('Employee account created successfully.');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create employee');
    } finally {
      setCreatingEmployee(false);
    }
  };

  const saveReportSettings = async () => {
    if (!workspace?.id) {
      return;
    }

    try {
      setReportSaving(true);
      await axios.put(
        `${apiBase}/api/reports/workspace/${workspace.id}/settings`,
        {
          enabled: true,
          frequency: 'daily',
          deliveryChannels: ['email'],
          recipients: parseRecipients(reportRecipients),
        },
        authConfig
      );
      await fetchWorkspaceDashboard();
      alert('Daily report settings saved.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save report settings.');
    } finally {
      setReportSaving(false);
    }
  };

  const previewReport = async () => {
    if (!workspace?.id) {
      return;
    }

    try {
      setReportPreviewing(true);
      const { data } = await axios.get(
        `${apiBase}/api/reports/preview?workspaceId=${workspace.id}`,
        authConfig
      );

      const previewWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!previewWindow) {
        alert('Please allow popups to preview the report.');
        return;
      }

      previewWindow.document.open();
      previewWindow.document.write(data);
      previewWindow.document.close();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to preview report.');
    } finally {
      setReportPreviewing(false);
    }
  };

  const sendReportNow = async () => {
    if (!workspace?.id) {
      return;
    }

    const recipients = parseRecipients(reportRecipients);
    if (recipients.length === 0) {
      alert('Add at least one report recipient.');
      return;
    }

    try {
      setReportSending(true);
      await axios.post(
        `${apiBase}/api/reports/send-email`,
        {
          workspaceId: workspace.id,
          recipients,
        },
        authConfig
      );
      await fetchWorkspaceDashboard();
      alert('Daily operations report sent.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send report.');
    } finally {
      setReportSending(false);
    }
  };

  const quickActions = [
    {
      title: 'Invite Employee',
      description: 'Share the company code or send a direct email invite.',
      action: copyInviteCode,
      cta: 'Copy Invite Code',
    },
    {
      title: 'Send Daily Report',
      description: 'Push today’s attendance and route summary to business owners.',
      action: sendReportNow,
      cta: reportSending ? 'Sending...' : 'Send Report Now',
      disabled: reportSending,
    },
    {
      title: 'Create Employee',
      description: 'Provision a fresh employee account inside this workspace.',
      action: () => document.getElementById('create-employee-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      cta: 'Open Employee Form',
    },
  ];

  const attendanceTotal = Math.max(1, liveOverview.attendance?.totalEmployees || stats.totalUsers || 1);
  const presentPct = Math.round(((liveOverview.attendance?.present || 0) / attendanceTotal) * 100);
  const latePct = Math.round(((liveOverview.attendance?.late || 0) / attendanceTotal) * 100);
  const absentPct = Math.round(((liveOverview.attendance?.absent || 0) / attendanceTotal) * 100);
  const activePct = Math.round(((liveOverview.summary?.activeUsers || 0) / Math.max(1, liveOverview.summary?.totalEmployees || stats.totalUsers || 1)) * 100);

  const liveActivityFeed = [
    {
      label: 'Live staff online',
      value: `${liveOverview.summary?.activeUsers || 0} active users`,
      tone: 'emerald',
    },
    {
      label: 'Attendance pulse',
      value: `${liveOverview.attendance?.present || 0} present, ${liveOverview.attendance?.late || 0} late`,
      tone: 'blue',
    },
    {
      label: 'Movement recorded',
      value: `${attendance.totalDistanceKm || 0} km tracked today`,
      tone: 'amber',
    },
    {
      label: 'Safety watch',
      value: `${liveOverview.summary?.sosAlerts || 0} SOS alerts in queue`,
      tone: 'red',
    },
  ];

  const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };

  const trendData = [
    { name: 'Attendance', value: presentPct || 0 },
    { name: 'Live', value: activePct || 0 },
    { name: 'Routes', value: Math.min(100, Math.round((attendance.totalDistanceKm || 0) * 3)) },
    { name: 'Reports', value: workspace?.reportSettings?.recipients?.length ? 92 : 48 },
  ];

  const attendancePieData = [
    { name: 'Present', value: liveOverview.attendance?.present || 0, color: '#10b981' },
    { name: 'Late', value: liveOverview.attendance?.late || 0, color: '#f59e0b' },
    { name: 'Absent', value: liveOverview.attendance?.absent || 0, color: '#ef4444' },
  ].filter((item) => item.value > 0);

  const liveMapPoints = (liveOverview.liveUsers || []).slice(0, 6).map((entry, index) => ({
    ...entry,
    left: `${18 + ((index * 13) % 62)}%`,
    top: `${20 + ((index * 11) % 52)}%`,
  }));

  return (
    <div className="max-w-[90rem] space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-8 py-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">Company Control Center</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">
              {workspace?.name || user?.user?.workspaceName || 'Your Company Workspace'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              One company account for admins, employees, attendance, live tracking, and daily reporting. This is the screen you can demo to buyers.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Trial + Paywall</p>
              <p className="mt-2 text-lg font-black">
                {trialExpired ? 'Trial Expired' : trialActive ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left` : user?.user?.subscriptionTier}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {trialExpired
                  ? 'Tracking is blocked until the workspace upgrades.'
                  : 'Hard paywall is active on protected tracking and report features.'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-emerald-400/10 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Recommended Billing</p>
              <p className="mt-2 text-lg font-black">Rs {workspace?.billing?.seatPriceMonthly || 50}/user/month</p>
              <p className="mt-1 text-xs text-emerald-100">
                Estimated monthly seat revenue: Rs {Number(stats.estimatedSeatRevenue || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">What To Do Next</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">Fast actions for a smoother operator workflow</h2>
              <p className="mt-2 text-sm text-slate-500">
                The dashboard should help admins act quickly, not hunt for controls. These shortcuts cover the most common jobs.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {trialExpired
                ? 'Workspace is blocked by the paywall until upgrade.'
                : trialActive
                  ? `Trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}.`
                  : 'Workspace is on a paid plan.'}
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {quickActions.map((item) => (
              <button
                key={item.title}
                onClick={item.action}
                disabled={item.disabled}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
              >
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{item.cta}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Operator Notes</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Designed for demos and daily use</h2>
          <div className="mt-4 space-y-3 text-sm text-amber-900">
            <p>Start at Live Monitoring when showing this to a customer.</p>
            <p>Use Attendance Snapshot to prove business value immediately.</p>
            <p>Use Daily Auto Reports to show owner-level control without opening multiple screens.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Executive Snapshot</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">One-screen summary for business owners</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Updated from live workspace data
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Operations Health</p>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-black">{presentPct}%</p>
                  <p className="mt-1 text-sm text-slate-300">Attendance coverage</p>
                </div>
                <div>
                  <p className="text-3xl font-black">{activePct}%</p>
                  <p className="mt-1 text-sm text-slate-300">Live visibility</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    <span>Present</span>
                    <span>{presentPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${presentPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    <span>Late</span>
                    <span>{latePct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-amber-400" style={{ width: `${latePct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    <span>Absent</span>
                    <span>{absentPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-rose-400" style={{ width: `${absentPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Revenue Story</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Seat billing</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">Rs {workspace?.billing?.seatPriceMonthly || 50}</p>
                  <p className="mt-1 text-sm text-slate-500">per user per month</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Employees</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{stats.employees || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Projected MRR</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">Rs {Number(stats.estimatedSeatRevenue || 0).toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  This makes the dashboard easier to pitch: the buyer can immediately connect workforce visibility to a simple monthly billing model.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Business Momentum</p>
                  <h3 className="mt-1 text-lg font-black text-slate-900">Premium trend panel</h3>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live style</span>
              </div>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
                    <Tooltip
                      cursor={{ stroke: '#10b981', strokeWidth: 1 }}
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid #d1d5db',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fill="url(#trendFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Attendance Mix</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">Today’s workforce split</h3>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendancePieData.length ? attendancePieData : [{ name: 'No Data', value: 1, color: '#cbd5e1' }]}
                      dataKey="value"
                      innerRadius={48}
                      outerRadius={74}
                      paddingAngle={4}
                    >
                      {(attendancePieData.length ? attendancePieData : [{ color: '#cbd5e1' }]).map((entry) => (
                        <Cell key={entry.name || entry.color} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid #d1d5db',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(attendancePieData.length ? attendancePieData : []).map((item) => (
                  <div key={item.name} className="rounded-xl bg-white px-3 py-3 text-center shadow-sm">
                    <div className="mx-auto h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.name}</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Live Activity Feed</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Signals that make the dashboard feel alive</h2>
          <div className="mt-6 space-y-3">
            {liveActivityFeed.map((item) => (
              <div key={item.label} className={`rounded-2xl border px-4 py-4 ${toneClasses[item.tone]}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">{item.label}</p>
                <p className="mt-2 text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,#dcfce7,transparent_35%),linear-gradient(135deg,#0f172a,#1e293b)] p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Live Map Preview</p>
                <h3 className="mt-1 text-lg font-black">Demo-friendly operations canvas</h3>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                {liveMapPoints.length} visible
              </span>
            </div>
            <div className="relative mt-4 h-60 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)),repeating-linear-gradient(0deg,transparent,transparent_39px,rgba(255,255,255,0.06)_40px),repeating-linear-gradient(90deg,transparent,transparent_39px,rgba(255,255,255,0.06)_40px)]">
              <div className="absolute inset-x-0 top-10 h-24 -rotate-6 bg-emerald-400/10 blur-2xl" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
              {liveMapPoints.map((point) => (
                <div
                  key={point.id}
                  className="absolute"
                  style={{ left: point.left, top: point.top }}
                >
                  <div className="relative">
                    <div className="absolute -inset-2 animate-pulse rounded-full bg-emerald-400/25" />
                    <div className="relative flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                  </div>
                  <div className="mt-2 -translate-x-1/3 rounded-lg bg-slate-950/85 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                    {point.name}
                  </div>
                </div>
              ))}
              {!liveMapPoints.length && (
                <div className="flex h-full items-center justify-center text-sm text-slate-300">
                  No live users on the map right now.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Why this helps UX</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Instead of forcing the user to read multiple widgets, the most important business signals are summarized in plain language.
            </p>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Edit Employee</h3>
            <form onSubmit={confirmEdit} className="mt-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="user">User (Employee)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {overviewCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <card.icon size={18} />
              </div>
            </div>
            <p className="mt-5 text-3xl font-black tracking-tight text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Employee Onboarding</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Workspace Invite Code</h2>
          <p className="mt-2 text-sm text-slate-500">
            Share this code with employees so they join the right company account during signup.
          </p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-2xl font-black tracking-[0.28em] text-slate-900">
              {workspace?.inviteCode || '------'}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyInviteCode}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Copy size={16} />
                Copy Code
              </button>
              <button
                onClick={regenerateInviteCode}
                disabled={regeneratingCode}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {regeneratingCode ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                Regenerate
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="employee@company.com"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={sendEmailInvite}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Mail size={16} />
              Email Invite
            </button>
          </div>
        </div>

        <div id="create-employee-form" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Direct Provisioning</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Create Employee Account</h2>
          <p className="mt-2 text-sm text-slate-500">
            Add an employee directly under this company and hand over a temporary password.
          </p>
          <form className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={createEmployee}>
            <input
              type="text"
              value={newEmployee.name}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="email"
              value={newEmployee.email}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Work email"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={newEmployee.password}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Temporary password"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:col-span-2"
            />
            <button
              type="submit"
              disabled={creatingEmployee}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:col-span-2"
            >
              {creatingEmployee ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Create Employee
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.4fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Live Monitoring</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">Today&apos;s Operations Screen</h2>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Refreshes every 30s
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Attendance</p>
                <p className="mt-2 text-sm text-slate-700">Present {liveOverview.attendance?.present || 0} of {liveOverview.attendance?.totalEmployees || 0}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Alerts</p>
                <p className="mt-2 text-sm text-slate-700">{liveOverview.summary?.sosAlerts || 0} active SOS signals</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Tracking</p>
                <p className="mt-2 text-sm text-slate-700">{liveOverview.summary?.activeUsers || 0} users currently live</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Distance</p>
                <p className="mt-2 text-sm text-slate-700">{attendance.totalDistanceKm || 0} km logged today</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              { label: 'Active Users', value: liveOverview.summary?.activeUsers || 0, icon: Activity, tone: 'bg-emerald-50 text-emerald-700' },
              { label: 'Inactive Users', value: liveOverview.summary?.inactiveUsers || 0, icon: UserX, tone: 'bg-slate-100 text-slate-700' },
              { label: 'Present', value: liveOverview.attendance?.present || 0, icon: UserCheck, tone: 'bg-blue-50 text-blue-700' },
              { label: 'SOS Alerts', value: liveOverview.summary?.sosAlerts || 0, icon: AlertTriangle, tone: 'bg-red-50 text-red-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                  <card.icon size={18} />
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Map size={16} className="text-slate-400" />
                Live Employee Locations
              </h3>
              <div className="mt-4 space-y-3">
                {liveOverview.liveUsers?.length ? liveOverview.liveUsers.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.name}</p>
                      <p className="text-xs text-slate-500">
                        {entry.lat?.toFixed(4)}, {entry.lng?.toFixed(4)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-emerald-700">Live</p>
                      <p className="text-[11px] text-slate-500">
                        {entry.lastSeenAt ? new Date(entry.lastSeenAt).toLocaleTimeString() : '-'}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No active employee locations right now.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <AlertTriangle size={16} className="text-red-400" />
                Recent SOS Alerts
              </h3>
              <div className="mt-4 space-y-3">
                {liveOverview.sosAlerts?.length ? liveOverview.sosAlerts.map((alert) => (
                  <div key={alert._id} className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-sm font-semibold text-red-900">{alert.message}</p>
                    <p className="mt-1 text-xs text-red-700">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                )) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No active SOS alerts in this workspace.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Attendance System</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Attendance Snapshot</h2>
            <p className="mt-2 text-sm text-slate-500">
              Auto check-in, work hours, and late arrivals from office geofence activity.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: 'Present', value: liveOverview.attendance?.present || 0, icon: UserCheck },
                { label: 'Late', value: liveOverview.attendance?.late || 0, icon: Clock3 },
                { label: 'Absent', value: liveOverview.attendance?.absent || 0, icon: UserX },
                { label: 'Work Hours', value: `${attendance.totalWorkHours || 0}h`, icon: BriefcaseBusiness },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <card.icon size={16} />
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Attendance Logic</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>Auto check-in and check-out runs from office geofence activity.</p>
                <p>Late status uses the workspace attendance settings on the server.</p>
                <p>Total hours are recorded into the daily report and workspace summary.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Daily Auto Reports</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Owner Report Delivery</h2>
            <p className="mt-2 text-sm text-slate-500">
              Generate a daily operations report with attendance, routes, total distance, work hours, and idle time.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Report recipients</p>
              <p className="mt-1 text-xs text-slate-500">Use comma-separated emails. Delivery is configured at company level.</p>
              <textarea
                value={reportRecipients}
                onChange={(e) => setReportRecipients(e.target.value)}
                rows={4}
                placeholder="owner@company.com, ops@company.com"
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="mt-5 space-y-3">
              <button
                onClick={saveReportSettings}
                disabled={reportSaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {reportSaving ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                Save Daily Report Settings
              </button>
              <button
                onClick={previewReport}
                disabled={reportPreviewing}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {reportPreviewing ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                Preview Report
              </button>
              <button
                onClick={sendReportNow}
                disabled={reportSending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {reportSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send Daily Report Now
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-950 px-4 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Report Scope</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-200">
                <p>Employee routes and movement totals</p>
                <p>Total distance and recorded work hours</p>
                <p>Idle time and attendance status</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">User Experience Goal</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                The report tools are placed beside attendance so admins don’t need to jump between screens to understand and act.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Company Directory</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Workspace Users</h2>
            <p className="mt-1 text-sm text-slate-500">Employees and admins belonging to this company account.</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{stats.admins || 0}</span> admins and <span className="font-semibold text-slate-900">{stats.employees || 0}</span> employees
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-400">
                    <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
                    Loading workspace data...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-400">
                    No users found in this workspace yet.
                  </td>
                </tr>
              ) : users.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-black uppercase text-slate-600">
                        {member.name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                      member.role === 'admin'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {member.role === 'admin' ? 'Admin' : 'Employee'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-700">{member.subscriptionTier}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                      member.trialStatus === 'active'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {member.trialStatus === 'active' ? 'Trial Active' : member.subscriptionTier}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => setEditingUser({ id: member.id, name: member.name, role: member.role })}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        title="Edit User"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteEmployee(member.id, member.name)}
                        className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                        title="Remove User"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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

export default WorkspaceAdmin;
