import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Users, Activity, Layers3, Receipt, Shield, BriefcaseBusiness, Clock3, Map, Loader2, Copy, RefreshCcw, Mail, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const WorkspaceAdmin = () => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
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
  const [inviteEmail, setInviteEmail] = useState('');
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    password: '',
  });

  const fetchWorkspaceDashboard = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/workspace-dashboard`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setWorkspace(data.data?.workspace || null);
      setUsers(data.data?.users || []);
      setStats(data.data?.stats || {});
      setAttendance(data.data?.attendance || {});
    } catch (err) {
      console.error('Fetch workspace admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceDashboard();
  }, [user]);

  const cards = [
    { label: 'Team Members', value: stats.totalUsers || 0, icon: Users, style: 'bg-blue-50 text-blue-600' },
    { label: 'Active Today', value: stats.activeUsers || 0, icon: Activity, style: 'bg-emerald-50 text-emerald-600' },
    { label: 'Groups', value: stats.totalGroups || 0, icon: Layers3, style: 'bg-indigo-50 text-indigo-600' },
    { label: 'Admins', value: stats.admins || 0, icon: Shield, style: 'bg-rose-50 text-rose-600' },
    { label: 'Employees', value: stats.employees || 0, icon: BriefcaseBusiness, style: 'bg-amber-50 text-amber-600' },
    { label: 'Revenue Collected', value: `Rs ${Number(stats.totalRevenueCollected || 0).toLocaleString()}`, icon: Receipt, style: 'bg-cyan-50 text-cyan-600' },
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
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/workspace/invite-code/regenerate`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
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
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/workspace/invite-email`,
        { email: inviteEmail.trim() },
        { headers: { Authorization: `Bearer ${user.token}` } }
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
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/workspace/employees/${id}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      alert('Employee deleted.');
      fetchWorkspaceDashboard();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete employee.');
    }
  };

  const confirmEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/workspace/employees/${editingUser.id}`,
        { name: editingUser.name, role: editingUser.role },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      alert('Employee updated.');
      setEditingUser(null);
      fetchWorkspaceDashboard();
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
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/workspace/employees`,
        newEmployee,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setNewEmployee({ name: '', email: '', password: '' });
      await fetchWorkspaceDashboard();
      alert('Employee account created successfully.');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create employee');
    } finally {
      setCreatingEmployee(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-slate-100">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">Workspace Admin</p>
        <h1 className="mt-3 text-3xl font-black text-white">
          {workspace?.name || user?.user?.workspaceName || 'Your Company Workspace'}
        </h1>
        <p className="mt-2 text-slate-400">
          Manage your company team, monitor attendance activity, and review workspace-level SaaS usage.
        </p>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 p-8 shadow-2xl border border-white/10">
            <h3 className="text-2xl font-black text-white mb-4">Edit Employee</h3>
            <form onSubmit={confirmEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:outline-none"
                >
                  <option value="user">User (Employee)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
          >
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${card.style}`}>
              <card.icon size={24} />
            </div>
            <p className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className="text-2xl font-black text-white">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">Employee Onboarding</p>
        <h2 className="mt-3 text-xl font-black text-white">Workspace Invite Code</h2>
        <p className="mt-2 text-sm text-slate-400">
          Share this code with employees so they can join your company workspace during signup.
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-2xl font-black tracking-[0.35em] text-white">
            {workspace?.inviteCode || '------'}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={copyInviteCode}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-red-700"
            >
              <Copy size={16} />
              Copy Code
            </button>
            <button
              onClick={regenerateInviteCode}
              disabled={regeneratingCode}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              {regeneratingCode ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Regenerate
            </button>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="employee@company.com"
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={sendEmailInvite}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-white/10"
          >
            <Mail size={16} />
            Email Invite
          </button>
        </div>
      </div>

      <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">Direct Provisioning</p>
        <h2 className="mt-3 text-xl font-black text-white">Create Employee Account</h2>
        <p className="mt-2 text-sm text-slate-400">
          Add an employee directly into your workspace and hand over their credentials securely.
        </p>
        <form className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={createEmployee}>
          <input
            type="text"
            value={newEmployee.name}
            onChange={(e) => setNewEmployee((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Employee name"
            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none"
          />
          <input
            type="email"
            value={newEmployee.email}
            onChange={(e) => setNewEmployee((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="employee@company.com"
            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none"
          />
          <input
            type="text"
            value={newEmployee.password}
            onChange={(e) => setNewEmployee((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="Temporary password"
            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={creatingEmployee}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-red-700 disabled:opacity-50 md:col-span-3"
          >
            {creatingEmployee ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Create Employee
          </button>
        </form>
      </div>

      <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 overflow-hidden">
        <div className="border-b border-white/10 p-6">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <BriefcaseBusiness size={20} className="text-primary-400" />
            Attendance Snapshot
          </h2>
          <p className="mt-1 text-sm text-slate-400">Today&apos;s tracked work summary for your workspace.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-6">
          {[
            { label: 'Today Sessions', value: attendance.totalSessions, icon: BriefcaseBusiness, style: 'bg-primary-50 text-primary-600' },
            { label: 'Open Sessions', value: attendance.openSessions, icon: Activity, style: 'bg-emerald-50 text-emerald-600' },
            { label: 'Total Work Hours', value: `${attendance.totalWorkHours || 0}h`, icon: Clock3, style: 'bg-amber-50 text-amber-600' },
            { label: 'Distance Logged', value: `${attendance.totalDistanceKm || 0} km`, icon: Map, style: 'bg-indigo-50 text-indigo-600' },
          ].map((card) => (
            <div key={card.label} className="rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${card.style}`}>
                <card.icon size={18} />
              </div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{card.label}</p>
              <p className="text-2xl font-black text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 overflow-hidden">
        <div className="border-b border-white/10 p-6">
          <h2 className="text-lg font-black">Workspace Users</h2>
          <p className="mt-1 text-sm text-slate-400">Users belonging to your company workspace.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-xs font-bold uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Loading workspace data...
                    </span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="4" className="p-10 text-center text-slate-400">No users found in this workspace yet.</td></tr>
              ) : users.map((member) => (
                <tr key={member.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-white">{member.name}</p>
                      <p className="text-xs text-slate-400">{member.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${
                      member.role === 'admin' ? 'bg-rose-500/15 text-rose-200' : 'bg-blue-500/15 text-blue-200'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{member.subscriptionTier}</td>
                  <td className="px-6 py-4 text-slate-400">{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setEditingUser({ id: member.id, name: member.name, role: member.role })}
                      className="text-primary-400 hover:text-primary-300 font-bold text-sm mr-4 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEmployee(member.id, member.name)}
                      className="text-red-500 hover:text-red-400 font-bold text-sm transition-colors"
                    >
                      Remove
                    </button>
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
