import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../redux/authSlice';
import { BarChart3, LogOut, ArrowLeft, Shield } from 'lucide-react';


const AdminLayout = ({ basePath = '/admin', title = 'Ksynq Admin Panel', subtitle = 'Dedicated admin workspace for platform oversight and reporting.', showAnalytics = true }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperadmin = user?.user?.role === 'superadmin';

  const navItems = [
    { name: 'Overview', path: basePath, icon: Shield },
    ...(showAnalytics ? [{ name: 'Analytics', path: `${basePath}/analytics`, icon: BarChart3 }] : []),
  ];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-primary-100 selection:text-primary-900">
      <div className="flex min-h-screen">
        {/* Enterprise Minimal Sidebar */}
        <aside className="w-72 border-r border-gray-200 bg-white px-6 py-8 shadow-sm flex flex-col z-10">
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-transparent shadow-sm">
                <img src="/favicon.svg" alt="Ksynq logo" className="h-5 w-5 object-contain" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600">{isSuperadmin ? 'Superadmin' : 'Admin'}</p>
                <h1 className="text-lg font-bold tracking-tight text-gray-900">Ksynq</h1>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500 leading-relaxed font-medium">
              {subtitle}
            </p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary-50 text-primary-700 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon size={18} className={isActive ? 'text-primary-600' : 'text-gray-400'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 mb-6">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Signed In As</p>
              <p className="mt-1 text-sm font-bold text-gray-900 truncate">{user?.user?.name || 'Admin User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.user?.email}</p>
            </div>

            <div className="space-y-2">
              <Link
                to="/dashboard"
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 shadow-sm"
              >
                <ArrowLeft size={16} className="text-gray-400" />
                <span>Return to App</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 hover:text-red-700"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA]">
          <header className="border-b border-gray-200 bg-white px-10 py-6 sticky top-0 z-0">
            <div className="max-w-7xl mx-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600">Platform Control</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">{title}</h2>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden p-10 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
