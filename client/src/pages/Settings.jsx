import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleInvisible } from '../redux/locationSlice';
import { updatePreferences } from '../redux/authSlice';
import { Settings as SettingsIcon, Shield, User, Mail, ShieldAlert, Bell, Plus, Trash2, Save, Loader2, Copy, ExternalLink, MessageCircle, Send, Smartphone } from 'lucide-react';
import { updateProfile } from '../redux/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { isBrowserNotificationSupported, requestBrowserNotificationPermission } from '../services/browserNotifications';
import axios from 'axios';
import {
  buildPublicSosUrl,
  buildSosShareText,
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
} from '../utils/sosLinks';

const Settings = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isInvisible } = useSelector((state) => state.location);
  
  const pushNotifications = user?.user?.preferences?.pushNotifications ?? true;

  const handleTogglePush = async () => {
    if (!pushNotifications) {
      const permission = await requestBrowserNotificationPermission();

      if (permission !== 'granted') {
        alert('Browser notification permission is required to enable push notifications.');
        return;
      }
    }

    dispatch(updatePreferences({ pushNotifications: !pushNotifications }));
  };

  const [contacts, setContacts] = React.useState(user?.user?.emergencyContacts || []);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTestingSOS, setIsTestingSOS] = React.useState(false);
  const [testSOSResult, setTestSOSResult] = React.useState(null);

  const handleAddContact = () => {
    setContacts([...contacts, { name: '', email: '', phone: '', preferredChannel: 'sms' }]);
  };

  const handleRemoveContact = (index) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleContactChange = (index, field, value) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const handleSaveContacts = async () => {
    setIsSaving(true);
    await dispatch(updateProfile({ emergencyContacts: contacts }));
    setIsSaving(false);
  };

  const getCurrentPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });

  const buildLocalFallback = (location = { lat: 0, lng: 0 }) => {
    const shareUrl = buildPublicSosUrl({
      lat: location.lat,
      lng: location.lng,
      userId: user?.user?.id || 'test-user',
    });
    const shareText = buildSosShareText({
      userName: user?.user?.name || 'Ksynq user',
      lat: location.lat,
      lng: location.lng,
      shareUrl,
      isTest: true,
    });

    return {
      publicSosUrl: shareUrl,
      shareText,
      whatsappUrl: buildWhatsAppShareUrl({ text: shareText }),
      telegramUrl: buildTelegramShareUrl({ text: shareText, shareUrl }),
      mailtoLinks: contacts
        .filter((contact) => contact.email)
        .map((contact) => ({
          contact: contact.name,
          email: contact.email,
          url: `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent('[TEST] Ksynq SOS Alert')}&body=${encodeURIComponent(shareText)}`,
        })),
    };
  };

  const copyToClipboard = async (value, successMessage) => {
    try {
      await navigator.clipboard.writeText(value);
      alert(successMessage);
    } catch (error) {
      alert('Copy failed on this device/browser.');
    }
  };

  const handleTestSOS = async () => {
    if (contacts.length === 0) {
      alert('Add a contact first!');
      return;
    }

    try {
      setIsTestingSOS(true);
      const token = user?.token;
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      let currentLocation = { lat: 0, lng: 0 };

      try {
        currentLocation = await getCurrentPosition();
      } catch (locationError) {
        console.warn('Unable to fetch current location for test SOS:', locationError);
      }

      const response = await axios.post(
        `${API_URL}/api/notifications/test-sos`,
        currentLocation,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const deliveryResults = response.data?.data?.results || [];
      const hasLiveDelivery = deliveryResults.some((item) => item.mode === 'live' && item.success);
      const sentCount = response.data?.data?.sentCount || 0;
      const fallback = response.data?.data?.fallback || buildLocalFallback(currentLocation);

      setTestSOSResult({
        sentCount,
        hasLiveSms: hasLiveDelivery,
        results: deliveryResults,
        fallback,
      });

      if (hasLiveDelivery) {
        alert(`Test SOS sent successfully to ${sentCount} contact channel(s).`);
      } else {
        alert('Test SOS processed. Share links are ready below for email, WhatsApp, Telegram, and the public SOS page.');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send test SOS');
    } finally {
      setIsTestingSOS(false);
    }
  };

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
            <h3 className="font-bold mb-2">Ksynq Premium</h3>
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
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Push Notifications</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Receive alerts when friends enter/exit areas.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={pushNotifications}
                    onChange={handleTogglePush}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <p className="text-[10px] text-primary-600 font-bold mt-2 uppercase flex items-center gap-1">
                <Shield size={10} /> Active and persistent
              </p>
              {!isBrowserNotificationSupported() && (
                <p className="text-[10px] text-red-600 font-bold mt-2 uppercase">
                  Browser notifications are not supported on this device/browser.
                </p>
              )}
            </div>
          </section>

          {/* Emergency Contacts Section */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden mb-12">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-red-600" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white">Emergency Contacts</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleTestSOS}
                  disabled={isTestingSOS}
                  className="text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition border border-red-100 dark:border-red-800 disabled:opacity-50"
                >
                  {isTestingSOS ? 'Sending...' : 'Test SOS'}
                </button>
                <button 
                  onClick={handleAddContact}
                  className="text-xs font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-3 py-1.5 rounded-lg transition border border-primary-100 dark:border-primary-800 flex items-center gap-1"
                >
                  <Plus size={14} /> Add New
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 mb-4">These people will be notified instantly when you trigger an SOS alert.</p>

              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                SMS becomes automatic only when a provider like Twilio is configured. WhatsApp can also send directly when WhatsApp Cloud API credentials are configured on the server. Until then, Ksynq uses share links for WhatsApp, email, Telegram, and the public SOS page.
              </div>
              
              <div className="space-y-4">
                <AnimatePresence>
                  {contacts.map((contact, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 relative group"
                    >
                      <button 
                        onClick={() => handleRemoveContact(index)}
                        className="absolute -top-2 -right-2 p-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Name</label>
                          <input 
                            type="text" 
                            value={contact.name}
                            onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                            placeholder="Full Name"
                            className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Phone</label>
                          <input 
                            type="text" 
                            value={contact.phone}
                            onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                            placeholder="+91 99999 99999"
                            className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Email (Optional)</label>
                          <input 
                            type="email" 
                            value={contact.email}
                            onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                            placeholder="email@example.com"
                            className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Preferred Channel</label>
                          <select
                            value={contact.preferredChannel || 'sms'}
                            onChange={(e) => handleContactChange(index, 'preferredChannel', e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          >
                            <option value="sms">SMS</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="email">Email</option>
                            <option value="telegram">Telegram</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {contacts.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                    <User className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={32} />
                    <p className="text-sm text-gray-500">No emergency contacts added yet.</p>
                  </div>
                )}
              </div>

              {contacts.length > 0 && (
                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleSaveContacts}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Save Contacts
                  </button>
                </div>
              )}

              {testSOSResult?.fallback && (
                <div className="mt-6 rounded-2xl border border-primary-100 bg-primary-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Free SOS Fallback Links</h4>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        {testSOSResult.hasLiveSms
                          ? `Live SMS was sent to ${testSOSResult.sentCount} channel(s). You can still use these backup links.`
                          : 'No SMS provider is configured, so these links are your free backup path.'}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(testSOSResult.fallback.publicSosUrl, 'Public SOS link copied.')}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-white px-3 py-2 text-xs font-bold text-primary-700 transition hover:bg-primary-100"
                    >
                      <Copy size={14} />
                      Copy Link
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <a
                      href={testSOSResult.fallback.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-green-700"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </a>
                    <a
                      href={testSOSResult.fallback.telegramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-xs font-bold text-white transition hover:bg-sky-600"
                    >
                      <Send size={14} />
                      Telegram
                    </a>
                    <a
                      href={testSOSResult.fallback.publicSosUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-primary-700"
                    >
                      <ExternalLink size={14} />
                      Open Public SOS
                    </a>
                  </div>

                  {testSOSResult.fallback.mailtoLinks?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {testSOSResult.fallback.mailtoLinks.map((item) => (
                        <div key={item.email} className="flex flex-col gap-2 rounded-xl border border-white/70 bg-white/80 p-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{item.contact || item.email}</p>
                            <p className="text-xs text-gray-500">{item.email}</p>
                          </div>
                          <a
                            href={item.url}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-200 px-3 py-2 text-xs font-bold text-primary-700 transition hover:bg-primary-100"
                          >
                            <Mail size={14} />
                            Compose Email
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {testSOSResult.fallback.whatsappLinks?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {testSOSResult.fallback.whatsappLinks.map((item) => (
                        <div key={`${item.contact}-${item.phone}`} className="flex flex-col gap-2 rounded-xl border border-white/70 bg-white/80 p-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{item.contact || item.phone}</p>
                            <p className="text-xs text-gray-500">{item.phone}</p>
                          </div>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-50"
                          >
                            <Smartphone size={14} />
                            Open WhatsApp
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
