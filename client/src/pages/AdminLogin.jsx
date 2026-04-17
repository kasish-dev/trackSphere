import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { login, logout, reset } from '../redux/authSlice';
import { Lock, Mail, Shield, Loader2 } from 'lucide-react';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [localError, setLocalError] = useState('');

  const { email, password } = formData;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, isError, isSuccess, message } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isError) {
      setLocalError(message || 'Admin sign-in failed.');
    }

    if (isSuccess || user) {
      if (user?.user?.role === 'superadmin') {
        navigate('/superadmin', { replace: true });
      } else if (user?.user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user) {
        dispatch(logout());
        setLocalError('This login is only for admin accounts.');
      }
    }

    dispatch(reset());
  }, [dispatch, isError, isSuccess, message, navigate, user]);

  const onChange = (e) => {
    setLocalError('');
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (isLoading) {
      return;
    }

    dispatch(login({ email, password }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="flex items-center justify-center px-6 py-12 lg:px-20">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600">
                  <Shield size={22} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">Secure Access</p>
                  <h1 className="text-3xl font-black tracking-tight">Ksynq Admin</h1>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-400">
                Sign in with an admin account to access the separate platform control panel.
              </p>
            </div>

            <form className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-8" onSubmit={onSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-200">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={onChange}
                    placeholder="admin@yourcompany.com"
                    className="block w-full rounded-xl border border-white/10 bg-slate-900 px-10 py-3 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={onChange}
                    placeholder="Enter your password"
                    className="block w-full rounded-xl border border-white/10 bg-slate-900 px-10 py-3 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {localError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {localError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Admin Sign In'}
              </button>

              <div className="text-sm text-slate-400">
                Need the normal app login?{' '}
                <Link to="/login" className="font-bold text-red-300 hover:text-red-200">
                  Go to user login
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-center border-l border-white/10 bg-gradient-to-br from-red-950 via-slate-950 to-slate-900 px-16">
          <div className="max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">Admin Workspace</p>
            <h2 className="mt-4 text-5xl font-black leading-tight">
              Separate control room for users, revenue, safety, and growth.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-300">
              This entrance is reserved for platform admins who need system-wide visibility into user adoption,
              billing signals, attendance activity, and operational alerts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
