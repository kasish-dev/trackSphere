import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../redux/authSlice';
import {
  BarChart3,
  LogOut,
  ArrowLeft,
  Shield,
  Menu,
  X,
  Building2,
} from 'lucide-react';

const AdminLayout = ({
  basePath = '/admin',
  title = 'Ksynq Admin Panel',
  subtitle = 'Dedicated admin workspace for platform oversight and reporting.',
  showAnalytics = true,
}) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperadmin = user?.user?.role === 'superadmin';
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { name: 'Overview', path: basePath, icon: Shield },
    ...(showAnalytics ? [{ name: 'Analytics', path: `${basePath}/analytics`, icon: BarChart3 }] : []),
  ];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  const NavLinks = ({ compact = false }) => (
    <nav className={compact ? 'grid gap-2' : 'space-y-1'}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={closeMenu}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              isActive
                ? 'bg-emerald-50 text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <item.icon size={18} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );

  const SidebarCard = () => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Signed In As</p>
      <p className="mt-2 text-sm font-bold text-slate-900 truncate">{user?.user?.name || 'Admin User'}</p>
      <p className="mt-1 text-xs text-slate-500 truncate">{user?.user?.email}</p>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">
        <Building2 size={14} className="text-emerald-600" />
        <span>{user?.user?.workspaceName || (isSuperadmin ? 'Platform Scope' : 'Workspace Admin')}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="border-b border-slate-200 bg-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Ksynq logo" className="h-6 w-6 object-contain" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-600">
                {isSuperadmin ? 'Superadmin' : 'Admin'}
              </p>
              <h1 className="text-sm font-bold text-slate-900">Ksynq Control</h1>
            </div>
          </div>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-xl border border-slate-200 p-2 text-slate-600"
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {menuOpen && (
          <div className="space-y-4 border-t border-slate-200 px-4 py-4">
            <NavLinks compact />
            <SidebarCard />
            <div className="grid gap-2">
              <Link
                to="/dashboard"
                onClick={closeMenu}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              >
                <ArrowLeft size={16} className="text-slate-400" />
                <span>Return to App</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-screen">
        <aside className="hidden w-80 flex-col border-r border-slate-200 bg-white px-6 py-8 shadow-sm lg:flex">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                <img src="/favicon.svg" alt="Ksynq logo" className="h-6 w-6 object-contain" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-emerald-600">
                  {isSuperadmin ? 'Superadmin' : 'Admin'}
                </p>
                <h1 className="text-lg font-black tracking-tight text-slate-900">Ksynq Control</h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">{subtitle}</p>
          </div>

          <div className="rounded-2xl bg-slate-950 px-5 py-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Workspace Mode</p>
            <h2 className="mt-2 text-lg font-black">
              {isSuperadmin ? 'Platform-Wide Oversight' : 'Company Operations'}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {isSuperadmin
                ? 'Monitor customers, revenue, and global operational health.'
                : 'Run attendance, live tracking, employees, and reports from one place.'}
            </p>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Navigation</p>
            <NavLinks />
          </div>

          <div className="mt-6">
            <SidebarCard />
          </div>

          <div className="mt-auto grid gap-2 pt-8">
            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} className="text-slate-400" />
              <span>Return to App</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-5 backdrop-blur-sm sm:px-6 lg:px-10">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-emerald-600">Platform Control</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  {isSuperadmin ? 'Global visibility' : 'Workspace visibility'}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {user?.user?.subscriptionTier || 'FREE'} plan
                </span>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
