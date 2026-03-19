import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Map, Users, Settings, LogOut, Menu, X, Bell, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchNotifications, addLocalNotification } from '../redux/notificationSlice';
import socket from '../services/socket';

const Layout = () => {
  const { user } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notifications);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  useEffect(() => {
    if (user) {
      dispatch(fetchNotifications());
      
      // Listen for real-time notifications via sockets
      socket.on('sos-received', (data) => {
        dispatch(addLocalNotification({
          _id: Date.now().toString(),
          type: 'sos',
          message: `EMERGENCY: ${data.userName} triggered an SOS!`,
          data: { ...data },
          isRead: false,
          createdAt: new Date().toISOString()
        }));
      });

      socket.on('geofence-alert', (alert) => {
        dispatch(addLocalNotification({
          _id: Date.now().toString(),
          type: 'geofence',
          message: `${alert.userName} entered ${alert.fenceName}`,
          data: { ...alert },
          isRead: false,
          createdAt: new Date().toISOString()
        }));
      });

      socket.on('new-member-alert', (alert) => {
        dispatch(addLocalNotification({
          _id: Date.now().toString(),
          type: 'group_join',
          message: `${alert.userName} joined the group!`,
          data: { ...alert },
          isRead: false,
          createdAt: new Date().toISOString()
        }));
      });

      socket.on('safety-anomaly', (alert) => {
        dispatch(addLocalNotification({
          _id: Date.now().toString(),
          type: 'safety-anomaly',
          message: alert.message,
          data: { ...alert },
          isRead: false,
          createdAt: new Date().toISOString()
        }));
      });
    }

    return () => {
      socket.off('sos-received');
      socket.off('geofence-alert');
      socket.off('new-member-alert');
      socket.off('safety-anomaly');
    };
  }, [dispatch, user]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { name: 'Live Map', path: '/', icon: <Map size={20} /> },
    { name: 'Groups', path: '/groups', icon: <Users size={20} /> },
    { name: 'History', path: '/history', icon: <History size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-primary-950 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <motion.div 
        initial={{ width: isSidebarOpen ? 256 : 80 }}
        animate={{ width: isSidebarOpen ? 256 : 80 }}
        className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border-r border-white/40 dark:border-gray-700/50 flex flex-col z-[100] relative"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary-600 p-2 rounded-lg">
            <Map className="text-white" size={24} />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight">TrackSphere</span>}
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
            >
              {item.icon}
              {isSidebarOpen && <span className="font-medium">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {isSidebarOpen && (
            <div className="mb-4 px-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">User</p>
              <p className="text-sm font-semibold truncate">{user?.user?.name || 'User'}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border-b border-white/40 dark:border-gray-700/50 flex items-center justify-between px-8 z-[90]">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/notifications" 
              className="p-2 relative hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg group"
            >
              <Bell size={20} className={unreadCount > 0 ? "text-primary-600" : ""} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800 font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white text-xs">
              {user?.user?.name?.[0] || 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-transparent relative z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Layout;
