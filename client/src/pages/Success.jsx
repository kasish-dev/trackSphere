import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Success = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Manually force the local session to remember they purchased PREMIUM for immediate UI unlock without re-login
    const localStr = localStorage.getItem('user');
    if (localStr) {
      try {
        const userObj = JSON.parse(localStr);
        if (userObj && userObj.user) {
          userObj.user.subscriptionTier = 'PREMIUM';
          localStorage.setItem('user', JSON.stringify(userObj));
        }
      } catch (e) {
        console.error('Failed to update local user session', e);
      }
    }
  }, []);

  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 p-8 md:p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center border border-gray-100 dark:border-gray-700"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          className="mx-auto w-24 h-24 bg-gradient-to-tr from-green-400 to-green-600 rounded-full flex flex-col items-center justify-center mb-6 shadow-lg shadow-green-500/30"
        >
          <CheckCircle size={48} className="text-white" />
        </motion.div>

        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Payment Successful!</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
          Welcome to <span className="font-bold text-primary-600 dark:text-primary-400">TrackSphere PRO</span>.
        </p>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 text-left mb-8 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap size={20} className="text-yellow-500" /> PRO Features Unlocked
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <ShieldCheck size={20} className="text-green-500 shrink-0" />
              <span>You can now create and join an <strong>unlimited number of groups</strong>.</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <ShieldCheck size={20} className="text-green-500 shrink-0" />
              <span>Full access to <strong>30-day Location History playback</strong>.</span>
            </li>
          </ul>
        </div>

        {sessionId === 'simulated_presentation_mode' && (
          <p className="text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg mb-6">
            Note: This was a simulated presentation checkout. No real card was charged.
          </p>
        )}

        <button 
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-white dark:to-gray-100 text-white dark:text-gray-900 font-bold text-lg py-4 rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          Proceed to Dashboard <ArrowRight size={20} />
        </button>
      </motion.div>
    </div>
  );
};

export default Success;
