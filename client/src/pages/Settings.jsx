import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleInvisible } from '../redux/locationSlice';
import { Settings as SettingsIcon, Shield, EyeOff, User, Mail, ShieldAlert, Bell } from 'lucide-react';

const Settings = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isInvisible } = useSelector((state) => state.location);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="text-primary-600" />
          User Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your profile and privacy preferences</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column - Profile Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-gray-800 shadow-inner">
              <User className="text-primary-600 dark:text-primary-400" size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.user?.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mt-1">
              <Mail size={14} /> {user?.user?.email}
            </p>
          </div>

          <div className="bg-primary-600 p-6 rounded-2xl text-white shadow-lg shadow-primary-600/20 relative overflow-hidden">
            <Shield className="absolute -right-4 -bottom-4 opacity-10 w-32 h-32" />
            <h3 className="font-bold mb-2">TrackSphere Premium</h3>
            <p className="text-sm text-primary-100 mb-4">Unlock advanced history analytics and geofencing alerts.</p>
            <button className="w-full py-2 bg-white text-primary-600 rounded-lg text-sm font-bold hover:bg-primary-50 transition">
              Upgrade Now
            </button>
          </div>
        </div>

        {/* Right Column - Settings Blocks */}
        <div className="md:col-span-2 space-y-6">
          {/* Privacy Section */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700/50 flex items-center gap-2">
              <ShieldAlert className="text-primary-600" size={20} />
              <h3 className="font-bold text-gray-900 dark:text-white">Privacy & Security</h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    Invisible Mode 
                    {isInvisible && <span className="bg-amber-100 text-amber-600 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">Active</span>}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                    When enabled, your live location will not be shared with group members or saved to your history.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isInvisible}
                    onChange={() => dispatch(toggleInvisible())}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">History Retention</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Keep my location history for 30 days.</p>
                </div>
                <button className="text-xs font-bold text-primary-600 hover:underline">Change</button>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700/50 flex items-center gap-2">
              <Bell className="text-primary-600" size={20} />
              <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Push Notifications</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Receive alerts when friends enter/exit areas.</p>
                </div>
                <div className="w-11 h-6 bg-gray-100 rounded-full relative">
                   <div className="absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full border border-gray-200"></div>
                </div>
              </div>
              <p className="text-[10px] text-amber-600 font-bold mt-2 uppercase">Beta feature - coming soon</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
