import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, MessageSquare, ShieldCheck, Clock, User } from 'lucide-react';
import axios from 'axios';
import socket from '../services/socket';

const GroupChat = ({ groupId, groupName, user, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tier, setTier] = useState('FREE');
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
    if (isOpen && groupId) {
      if (!socket.connected) {
        socket.connect();
      }

      socket.emit('join-group', groupId);
      fetchMessages();
    }

    return () => {
      if (groupId) {
        socket.emit('leave-group', groupId);
      }
    };
  }, [isOpen, groupId]);

  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      if (normalizeId(msg.groupId) === normalizeId(groupId)) {
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
  }, [groupId]);

  useEffect(() => {
    // Auto scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!groupId) return;

    try {
      setIsLoading(true);
      const userData = JSON.parse(localStorage.getItem('user'));
      const token = userData?.token;

      const response = await axios.get(`${API_URL}/api/chat/${groupId}`, {
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
    if (!newMessage.trim() || !user?.user) return;

    const messageText = newMessage.trim();
    const createdAt = new Date().toISOString();
    const messageData = {
      groupId,
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

    // Emit via socket (backend handles saving to DB)
    socket.emit('send-message', messageData);
    setNewMessage('');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed top-0 right-0 h-full w-full max-w-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-2xl z-[2000] border-l border-white/20 dark:border-gray-800/50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-primary-600 text-white">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} />
          <div>
            <h3 className="font-bold text-sm leading-tight">{groupName} Chat</h3>
            <p className="text-[10px] opacity-80 flex items-center gap-1 uppercase tracking-wider font-bold">
              {['PRO', 'BUSINESS', 'ENTERPRISE'].includes(tier) ? (
                <><ShieldCheck size={10} /> 30-Day History Ready</>
              ) : (
                <><Clock size={10} /> 24h View (Free)</>
              )}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
          <X size={20} />
        </button>
      </div>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <div className="bg-gray-100 dark:bg-gray-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="text-gray-400" size={24} />
            </div>
            <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = normalizeId(msg.senderId) === normalizeId(user?.user?.id);
            return (
              <div 
                key={msg._id || index}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                  <span className="text-[10px] font-bold text-gray-400 mb-1 ml-2 flex items-center gap-1">
                    <User size={8} /> {msg.userName}
                  </span>
                )}
                <div className={`
                  max-w-[85%] px-4 py-2 rounded-2xl shadow-sm text-sm
                  ${isMe 
                    ? 'bg-primary-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-none'
                  }
                `}>
                  {msg.text}
                </div>
                <span className="text-[9px] text-gray-400 mt-1 px-1">
                   {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition shadow-inner"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-1.5 p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default GroupChat;
