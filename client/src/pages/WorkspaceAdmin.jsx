import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Users, Activity, Layers3, Receipt, Shield, BriefcaseBusiness, Clock3, Map, Loader2, Copy, RefreshCcw, Mail, UserPlus, Trash2, Edit } from 'lucide-react';
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

  const overviewCards = [
    { label: 'Team Members', value: stats.totalUsers || 0, icon: Users },
    { label: 'Active Today', value: stats.activeUsers || 0, icon: Activity },
    { label: 'Groups', value: stats.totalGroups || 0, icon: Layers3 },
    { label: 'Admins', value: stats.admins || 0, icon: Shield },
    { label: 'Employees', value: stats.employees || 0, icon: BriefcaseBusiness },
    { label: 'Revenue Collected', value: `Rs ${Number(stats.totalRevenueCollected || 0).toLocaleString()}`, icon: Receipt },
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
    <div className="max-w-[90rem]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {workspace?.name || user?.user?.workspaceName || 'Your Company Workspace'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your company team, monitor attendance activity, and review workspace-level SaaS usage.
        </p>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">Edit Employee</h3>
            <form onSubmit={confirmEdit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-sm"
                >
                  <option value="user">User (Employee)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 rounded-lg bg-white border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        {overviewCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
               <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{card.label}</p>
               <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-500">
                <card.icon size={16} />
               </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-auto">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* Onboarding Box */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-1">Employee Onboarding</p>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Workspace Invite Code</h2>
          <p className="mt-1 text-sm text-gray-500">
            Share this code with employees so they can join your company workspace during signup.
          </p>
          
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-3.5 text-2xl font-bold tracking-[0.25em] text-gray-900 shadow-inner">
              {workspace?.inviteCode || '------'}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyInviteCode}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 shadow-sm"
              >
                <Copy size={16} />
                Copy Code
              </button>
              <button
                onClick={regenerateInviteCode}
                disabled={regeneratingCode}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 shadow-sm"
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
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
            />
            <button
              onClick={sendEmailInvite}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm"
            >
              <Mail size={16} />
              Email Invite
            </button>
          </div>
        </div>

        {/* Direct Provisioning Box */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-1">Direct Provisioning</p>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Create Employee Account</h2>
          <p className="mt-1 text-sm text-gray-500">
            Add an employee directly into your workspace and hand over their credentials securely.
          </p>
          <form className="mt-6 gap-3 grid grid-cols-1 sm:grid-cols-2" onSubmit={createEmployee}>
            <input
              type="text"
              value={newEmployee.name}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
            />
            <input
              type="email"
              value={newEmployee.email}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Work email"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
            />
            <input
              type="text"
              value={newEmployee.password}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Temporary password"
              className="col-span-1 sm:col-span-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
            />
            <button
              type="submit"
              disabled={creatingEmployee}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50 col-span-1 sm:col-span-2 shadow-sm"
            >
              {creatingEmployee ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Create Employee
            </button>
          </form>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 tracking-tight">
            <BriefcaseBusiness size={16} className="text-gray-400" />
            Attendance Snapshot
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">Today&apos;s tracked work summary for your workspace.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0 divide-y xl:divide-y-0 xl:divide-x divide-gray-100">
          {[
            { label: 'Today Sessions', value: attendance.totalSessions, icon: BriefcaseBusiness },
            { label: 'Open Sessions', value: attendance.openSessions, icon: Activity },
            { label: 'Total Work Hours', value: `${attendance.totalWorkHours || 0}h`, icon: Clock3 },
            { label: 'Distance Logged', value: `${attendance.totalDistanceKm || 0} km`, icon: Map },
          ].map((card) => (
            <div key={card.label} className="p-6 bg-gray-50/30">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 shadow-sm">
                <card.icon size={14} />
              </div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{card.label}</p>
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col mb-8">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Workspace Users</h2>
          <p className="mt-0.5 text-xs text-gray-500">Users belonging to your company workspace.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#FAFAFA] border-b border-gray-200 text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 whitespace-nowrap">User</th>
                <th className="px-6 py-3 whitespace-nowrap">Role</th>
                <th className="px-6 py-3 whitespace-nowrap">Plan</th>
                <th className="px-6 py-3 whitespace-nowrap">Joined</th>
                <th className="px-6 py-3 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-400 font-medium">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2 text-gray-300" />
                    Loading workspace data...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-400 font-medium">No users found in this workspace yet.</td></tr>
              ) : users.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-3.5">
                     <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs uppercase">
                            {member.name?.[0] || 'U'}
                         </div>
                         <div>
                           <p className="font-semibold text-sm text-gray-900 group-hover:text-primary-600 transition-colors">{member.name}</p>
                           <p className="text-xs text-gray-500">{member.email}</p>
                         </div>
                     </div>
                  </td>
                  <td className="px-6 py-3.5">
                    {member.role === 'admin' ? (
                       <span className="inline-flex items-center bg-gray-900 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                         Admin
                       </span>
                    ) : (
                       <span className="inline-flex items-center bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                         Employee
                       </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-700 capitalize">{member.subscriptionTier?.toLowerCase()}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-600">{member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingUser({ id: member.id, name: member.name, role: member.role })}
                        className="inline-flex items-center gap-1.5 p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all border border-transparent shadow-none hover:shadow-sm"
                        title="Edit User"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteEmployee(member.id, member.name)}
                        className="inline-flex items-center gap-1.5 p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-all border border-transparent shadow-none hover:shadow-sm"
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
