import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchNotifications, markAsRead, markAllAsRead } from '../redux/notificationSlice';
import { Bell, CheckCheck, ShieldAlert, MapPin, Users, Info, Clock, Trash2 } from 'lucide-react';

const Notifications = () => {
  const dispatch = useDispatch();
  const { notifications, isLoading } = useSelector((state) => state.notifications);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const getIcon = (type) => {
    switch (type) {
      case 'sos':
        return <ShieldAlert className="text-red-600" size={20} />;
      case 'geofence':
        return <MapPin className="text-primary-600" size={20} />;
      case 'group_join':
        return <Users className="text-green-600" size={20} />;
      default:
        return <Info className="text-blue-600" size={20} />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="text-primary-600" />
            Notifications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Stay updated on group activity and alerts</p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={() => dispatch(markAllAsRead())}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
          >
            <CheckCheck size={18} />
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
            <Bell className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No notifications yet</h3>
            <p className="text-gray-500 dark:text-gray-400">You're all caught up! New alerts will appear here.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif._id}
              className={`group bg-white dark:bg-gray-800 p-4 rounded-2xl border transition relative overflow-hidden ${
                notif.isRead 
                  ? 'border-gray-100 dark:border-gray-700 opacity-75' 
                  : 'border-primary-100 dark:border-primary-900/50 shadow-md ring-1 ring-primary-50 dark:ring-primary-900/20'
              }`}
            >
              {!notif.isRead && (
                <div className="absolute top-0 left-0 w-1 h-full bg-primary-600"></div>
              )}
              
              <div className="flex gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${
                  notif.type === 'sos' ? 'bg-red-50 dark:bg-red-900/20' : 
                  notif.type === 'geofence' ? 'bg-primary-50 dark:bg-primary-900/20' : 
                  'bg-gray-50 dark:bg-gray-700/50'
                }`}>
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-bold truncate ${notif.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                      {notif.message}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 uppercase shrink-0">
                      <Clock size={10} /> {formatDate(notif.createdAt)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                       {notif.type === 'sos' && `Alert from ${notif.data?.userName || 'a member'}`}
                       {notif.type === 'geofence' && `Location: ${notif.data?.fenceName || 'Unknown Zone'}`}
                       {notif.type === 'group_join' && `Welcome to the group!`}
                    </p>
                    
                    {!notif.isRead && (
                      <button
                        onClick={() => dispatch(markAsRead(notif._id))}
                        className="text-[10px] font-bold text-primary-600 hover:underline uppercase tracking-wider"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
