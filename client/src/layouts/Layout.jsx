import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import { Link, useNavigate } from 'react-router-dom';
import { Map, Users, Settings, LogOut, Menu, X, Bell, History } from 'lucide-react';

const Layout = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col`}>
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-8">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            <button className="p-2 relative hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white text-xs">
              {user?.user?.name?.[0] || 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
