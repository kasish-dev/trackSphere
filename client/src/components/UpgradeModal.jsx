import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Users, History, Zap, CheckCircle2, X, Loader2 } from 'lucide-react';
import axios from 'axios';

const UpgradeModal = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgradeClick = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const userData = JSON.parse(localStorage.getItem('user'));
      const token = userData?.token;
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const response = await axios.post(
        `${API_URL}/api/subscriptions/create-checkout-session`, 
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data?.url) {
        window.location.href = response.data.url; // Redirect to Stripe (or our simulated Success page)
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Payment gateway error. Please try again later.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
        >
          {/* Header Gradient */}
          <div className="bg-gradient-to-br from-indigo-500 via-primary-500 to-teal-400 p-8 text-white relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur transition"
            >
              <X size={20} />
            </button>
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <Zap size={32} className="text-yellow-300" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-center mb-2 tracking-tight">TrackSphere PRO</h2>
            <p className="text-center text-primary-50 font-medium">Unlock the ultimate safety toolkit.</p>
          </div>

          <div className="p-8">
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-xl text-primary-600 dark:text-primary-400 mt-1">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Unlimited Groups</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Free tier is limited to 1 group. Create as many groups as you need for family, friends, and colleagues.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-xl text-pink-600 dark:text-pink-400 mt-1">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">30-Day Location History</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Review past routes and locations for up to a month, compared to just 24 hours on the Free tier.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl text-red-600 dark:text-red-400 mt-1">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Priority AI Risk Alerts</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get faster, higher-priority processing for AI Anomaly Detection and routing.</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 flex justify-between items-center mb-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase">Monthly</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">$4.99</span>
                  <span className="text-gray-500">/mo</span>
                </div>
              </div>
              <ul className="space-y-1">
                {['Cancel anytime', 'Billed monthly'].map(text => (
                  <li key={text} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                    <CheckCircle2 size={14} className="text-green-500" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-4 text-center font-bold bg-red-50 p-2 rounded-lg">{error}</p>
            )}

            <button 
              onClick={handleUpgradeClick}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-primary-600 hover:from-indigo-700 hover:to-primary-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:shadow-primary-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'Upgrade to PRO'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">Secure payment via Stripe. No hidden fees.</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UpgradeModal;
