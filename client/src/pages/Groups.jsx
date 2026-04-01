import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import socket from '../services/socket';
import { Plus, Users, UserPlus, Copy, Check, Shield, Loader2, AlertCircle, Share2, Zap, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchGroups, createGroup, joinGroup, deleteGroup, resetGroupState } from '../redux/groupSlice';
import UpgradeModal from '../components/UpgradeModal';

const Groups = () => {
  const [activeTab, setActiveTab] = useState('my-groups');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState(null);
  const [searchParams] = useSearchParams();

  const dispatch = useDispatch();
  const { groups, isLoading, isError, isSuccess, message } = useSelector((state) => state.groups);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchGroups());

    // Check for invite code in URL
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setInviteCode(urlCode.toUpperCase());
      setActiveTab('join');
    }
  }, [dispatch, searchParams]);

  useEffect(() => {
    if (isSuccess) {
      if (activeTab === 'join') {
        // Notify others that we joined
        socket.emit('member-joined', {
          userName: user?.user?.name,
          groupId: groups.find(g => g.inviteCode === inviteCode.toUpperCase())?._id || 'newly-joined'
        });
      }
      setGroupName('');
      setInviteCode('');
      setActiveTab('my-groups');
      dispatch(resetGroupState());
    }

    // Intercept 403 Tier Limit errors from backend
    if (isError && message && message.includes('Upgrade to PRO')) {
      setShowUpgradeModal(true);
      dispatch(resetGroupState()); // Clear the error so it doesn't linger
    }
  }, [isSuccess, isError, message, dispatch, user, groups, inviteCode, activeTab]);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShare = async (group) => {
    const shareData = {
      title: 'Join my TrackSphere group!',
      text: `Join my group "${group.name}" on TrackSphere using this invite code: ${group.inviteCode}`,
      url: `${window.location.origin}/groups?code=${group.inviteCode}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy and open mailto
        handleCopy(group.inviteCode);
        window.location.href = `mailto:?subject=Join my TrackSphere group&body=${encodeURIComponent(shareData.text)}`;
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleOpenAction = (tab) => {
    // Treat undefined or 'FREE' as free tier
    const isFree = !user?.user?.subscriptionTier || user.user.subscriptionTier === 'FREE';

    if (isFree && groups.length >= 1) {
      setShowUpgradeModal(true);
      return;
    }
    setActiveTab(tab);
    dispatch(resetGroupState());
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (groupName.trim()) {
      dispatch(createGroup({ name: groupName }));
    }
  };

  const handleJoinGroup = (e) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      dispatch(joinGroup({ inviteCode: inviteCode.toUpperCase() }));
    }
  };

  const handleDeleteGroup = (groupId, groupName) => {
    if (window.confirm(`Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`)) {
      dispatch(deleteGroup(groupId));
    }
  };

  const getUserRole = (group) => {
    return group.owner?._id === user?.user?.id || group.owner === user?.user?.id
      ? 'Owner'
      : 'Member';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="text-primary-600" />
          Group Management
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenAction('create')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-primary-600 shadow-md text-white rounded-lg hover:from-indigo-600 hover:to-primary-700 transition"
          >
            <Plus size={18} /> Create Group
          </button>
          <button
            onClick={() => handleOpenAction('join')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300"
          >
            <UserPlus size={18} /> Join Group
          </button>
        </div>
      </div>

      {isError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
        </div>
      )}

      {activeTab === 'my-groups' && (
        <>
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin h-8 w-8 text-primary-600" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-20">
              <Users className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">No groups yet</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">Create a group or join one with an invite code!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <div key={group._id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg">
                      <Shield className="text-primary-600 dark:text-primary-400" size={24} />
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getUserRole(group) === 'Owner' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                      {getUserRole(group)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{group.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {group.members?.length || 0} member{(group.members?.length || 0) !== 1 ? 's' : ''}
                  </p>

                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Invite Code</p>
                      <p className="font-mono text-primary-600 font-bold">{group.inviteCode}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(group.inviteCode)}
                      className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-md transition"
                    >
                      {copied === group.inviteCode ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                    </button>
                    <button
                      onClick={() => handleShare(group)}
                      className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-md transition text-primary-600"
                      title="Share group"
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      onClick={() => setSelectedGroupMembers(group)}
                      className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-md transition text-primary-600"
                      title="View Members"
                    >
                      <Users size={16} />
                    </button>
                    {getUserRole(group) === 'Owner' && (
                      <button
                        onClick={() => handleDeleteGroup(group._id, group.name)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition text-red-500"
                        title="Delete group"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'create' && (
        <div className="max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Create a New Group</h2>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. My Family"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-bold disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Create Group'}
            </button>
            <button type="button" onClick={() => setActiveTab('my-groups')} className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm">
              Cancel
            </button>
          </form>
        </div>
      )}

      {activeTab === 'join' && (
        <div className="max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Join a Group</h2>
          <form onSubmit={handleJoinGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Enter Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. ABCD12"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white uppercase font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-bold disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Join Group'}
            </button>
            <button type="button" onClick={() => setActiveTab('my-groups')} className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm">
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Premium Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      {/* Members Modal */}
      <AnimatePresence>
        {selectedGroupMembers && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-gray-700"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-primary-600 text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users size={20} />
                  {selectedGroupMembers.name} Members
                </h3>
                <button
                  onClick={() => setSelectedGroupMembers(null)}
                  className="p-1 hover:bg-white/20 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                  {selectedGroupMembers.members?.map((member) => (
                    <div key={member._id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold shrink-0">
                        {member.name?.[0] || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{member.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        (selectedGroupMembers.owner?._id === member._id || selectedGroupMembers.owner === member._id)
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      }`}>
                        {(selectedGroupMembers.owner?._id === member._id || selectedGroupMembers.owner === member._id) ? 'Owner' : 'Member'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => setSelectedGroupMembers(null)}
                  className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-bold transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Groups;
