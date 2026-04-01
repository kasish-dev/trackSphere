import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { MessageSquare, ShieldCheck, Clock, Users, Loader2, Search, Send } from 'lucide-react';
import axios from 'axios';
import socket from '../services/socket';
import { fetchGroups } from '../redux/groupSlice';

const Chat = () => {
  const { groupId: urlGroupId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { groups } = useSelector((state) => state.groups);

  const [activeGroupId, setActiveGroupId] = useState(urlGroupId || searchParams.get('id') || '');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tier, setTier] = useState('FREE');
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef(null);
  const pendingMessageIds = useRef(new Set());

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const normalizeId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.$oid) return value.$oid;
    if (typeof value === 'object' && typeof value.toString === 'function') {
      return value.toString();
    }
    return String(value);
  };
  const buildMessageKey = (msg) => {
    const createdAt = msg?.createdAt ? new Date(msg.createdAt).getTime() : '';
    return [
      normalizeId(msg?.groupId),
      normalizeId(msg?.senderId),
      msg?.text?.trim() || '',
      createdAt,
    ].join('|');
  };

  useEffect(() => {
    if (!groups.length && user?.token) {
      dispatch(fetchGroups());
    }
  }, [dispatch, groups.length, user?.token]);

  useEffect(() => {
    if (!user?.token) return;

    if (!socket.connected) {
      socket.connect();
    }
  }, [user?.token]);

  // Sync activeGroupId with URL
  useEffect(() => {
    if (urlGroupId) {
      setActiveGroupId(urlGroupId);
    } else if (searchParams.get('id')) {
      setActiveGroupId(searchParams.get('id'));
    } else if (groups.length > 0 && !activeGroupId) {
      setActiveGroupId(groups[0]._id);
    }
  }, [urlGroupId, searchParams, groups]);

  useEffect(() => {
    if (activeGroupId) {
      fetchMessages();

      if (!socket.connected) {
        socket.connect();
      }

      socket.emit('join-group', activeGroupId);
    }
    
    return () => {
      if (activeGroupId) {
        socket.emit('leave-group', activeGroupId);
      }
    };
  }, [activeGroupId]);

  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      if (normalizeId(msg.groupId) === normalizeId(activeGroupId)) {
        const incomingKey = buildMessageKey(msg);
        pendingMessageIds.current.delete(incomingKey);

        setMessages((prev) => {
          const existingIndex = prev.findIndex((existingMsg) => {
            if (existingMsg._id && msg._id) {
              return existingMsg._id === msg._id;
            }

            return buildMessageKey(existingMsg) === incomingKey;
          });

          if (existingIndex !== -1) {
            const next = [...prev];
            next[existingIndex] = { ...prev[existingIndex], ...msg, optimistic: false };
            return next;
          }

          return [...prev, msg];
        });
      }
    };

    socket.on('receive-message', handleReceiveMessage);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [activeGroupId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!activeGroupId || !user?.token) return;

    try {
      setIsLoading(true);
      const token = user?.token;

      const response = await axios.get(`${API_URL}/api/chat/${activeGroupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(response.data.messages || []);
      setTier(response.data.tier || 'FREE');
      setIsLoading(false);
    } catch (err) {
      console.error('Fetch messages error:', err);
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.user || !activeGroupId) return;

    const messageText = newMessage.trim();
    const createdAt = new Date().toISOString();
    const messageData = {
      groupId: activeGroupId,
      senderId: user.user.id,
      userName: user.user.name,
      text: messageText,
      createdAt
    };

    const optimisticMessage = {
      ...messageData,
      _id: `temp-${Date.now()}`,
      optimistic: true
    };

    pendingMessageIds.current.add(buildMessageKey(messageData));
    setMessages((prev) => [...prev, optimisticMessage]);

    socket.emit('send-message', messageData);
    setNewMessage('');
  };

  const handleGroupSelect = (id) => {
    setActiveGroupId(id);
    setSearchParams({ id });
    navigate(`/chat/${id}`);
  };

  const activeGroup = groups.find(g => g._id === activeGroupId);
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-gray-900">
      {/* Sidebar - Group List */}
      <div className="w-80 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/30 dark:bg-gray-900/30">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="text-primary-600" />
            Messages
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Users className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={32} />
              <p className="text-sm text-gray-500">No groups found</p>
            </div>
          ) : (
            filteredGroups.map(group => (
              <button
                key={group._id}
                onClick={() => handleGroupSelect(group._id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${
                  activeGroupId === group._id 
                    ? 'bg-primary-600 text-white shadow-lg' 
                    : 'hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  activeGroupId === group._id ? 'bg-white/20' : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                }`}>
                  {group.name[0]}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-bold truncate">{group.name}</p>
                  <p className={`text-xs truncate ${activeGroupId === group._id ? 'text-white/70' : 'text-gray-500'}`}>
                    {group.members?.length || 0} members
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        {activeGroupId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-gray-100 dark:border-gray-800 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
                  {activeGroup?.name?.[0] || 'G'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white leading-tight">
                    {activeGroup?.name || 'Group'}
                  </h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1">
                    {['PRO', 'BUSINESS', 'ENTERPRISE'].includes(tier) ? (
                      <><ShieldCheck size={12} className="text-green-500" /> Premium History</>
                    ) : (
                      <><Clock size={12} /> 24h Window</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages List */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-primary-600" size={32} />
                  <p className="text-sm text-gray-500">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <MessageSquare size={48} className="mb-4" />
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Be the first to say hello!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = normalizeId(msg.senderId) === normalizeId(user?.user?.id);
                  return (
                    <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && (
                          <span className="text-[10px] font-bold text-gray-500 mb-1 ml-1">
                            {msg.userName}
                          </span>
                        )}
                        <div className={`
                          px-4 py-2.5 rounded-2xl text-sm shadow-sm
                          ${isMe 
                            ? 'bg-primary-600 text-white rounded-tr-none' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700'
                          }
                        `}>
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-1 px-1 italic">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-4 pr-16 focus:ring-2 focus:ring-primary-500 transition outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition disabled:opacity-50 hover:scale-105 active:scale-95"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/20 text-primary-600 rounded-3xl flex items-center justify-center mb-6">
              <MessageSquare size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Select a Group</h2>
            <p className="text-gray-500 max-w-sm">
              Choose a group from the sidebar to start chatting with your team or family members in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
