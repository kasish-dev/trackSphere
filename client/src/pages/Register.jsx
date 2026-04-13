import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register, reset } from '../redux/authSlice';
import { UserPlus, Mail, Lock, User, Loader2, Briefcase, Users } from 'lucide-react';

const ACCOUNT_TYPES = [
  {
    id: 'individual',
    title: 'Individual User',
    description: 'For personal safety tracking and family use.',
    icon: User,
  },
  {
    id: 'business_owner',
    title: 'Business Owner',
    description: 'For companies that need billing, analytics, and team oversight.',
    icon: Briefcase,
  },
  {
    id: 'employee',
    title: 'Employee',
    description: 'For staff members joining a tracked team or company group.',
    icon: Users,
  },
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    workspaceInviteCode: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: '',
  });

  const { name, companyName, workspaceInviteCode, email, password, confirmPassword, accountType } = formData;

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isError) {
      console.error(message);
    }

    if (isSuccess || user) {
      navigate(
        user?.user?.role === 'superadmin'
          ? '/superadmin'
          : user?.user?.role === 'admin'
            ? '/admin'
            : '/dashboard',
        { replace: true }
      );
    }

    dispatch(reset());
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();

    if (!accountType) {
      alert('Please choose an account type');
      return;
    }

    if (accountType === 'business_owner' && !companyName.trim()) {
      alert('Please enter your company name');
      return;
    }

    if (accountType === 'employee' && !workspaceInviteCode.trim()) {
      alert('Please enter your company invite code');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
    } else {
      const userData = { name, email, password, accountType, companyName, workspaceInviteCode };
      dispatch(register(userData));
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-gray-950">
      {/* Left side - Register Form */}
      <div className="flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">TrackSphere</h1>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8">
            <div className="mt-6">
              <form className="space-y-4" onSubmit={onSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account Type
                  </label>
                  <div className="mt-2 space-y-2">
                    {ACCOUNT_TYPES.map((option) => {
                      const Icon = option.icon;
                      const selected = accountType === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setFormData((prevState) => ({ ...prevState, accountType: option.id }))}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            selected
                              ? 'border-primary-500 bg-primary-50 text-primary-900'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-primary-200 hover:bg-primary-50/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${selected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300'}`}>
                              <Icon size={18} />
                            </div>
                            <div>
                              <div className="text-sm font-bold">{option.title}</div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={onChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all sm:text-sm"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                {accountType === 'business_owner' && (
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Company Name
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="companyName"
                        name="companyName"
                        type="text"
                        required
                        value={companyName}
                        onChange={onChange}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all sm:text-sm"
                        placeholder="Your company name"
                      />
                    </div>
                  </div>
                )}

                {accountType === 'employee' && (
                  <div>
                    <label htmlFor="workspaceInviteCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Company Invite Code
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="workspaceInviteCode"
                        name="workspaceInviteCode"
                        type="text"
                        required
                        value={workspaceInviteCode}
                        onChange={onChange}
                        className="block w-full pl-10 pr-3 py-2 uppercase border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all sm:text-sm"
                        placeholder="Enter company invite code"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Ask your company admin for the workspace invite code before creating your employee account.
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={onChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all sm:text-sm"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={onChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all sm:text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Password
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={onChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all sm:text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {isError && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                    <div className="text-sm text-red-700 dark:text-red-400">{message}</div>
                  </div>
                )}

                {!accountType && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-4">
                    <div className="text-sm text-amber-700 dark:text-amber-300">Choose an account type before creating the account.</div>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isLoading || !accountType}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                      'Create account'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Hero Image */}
      <div className="hidden lg:block relative overflow-hidden">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="/hero-bg.png"
          alt="Tracking visualization"
        />
        <div className="absolute inset-0 bg-primary-900/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-90" />
        
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <h3 className="text-4xl font-bold text-white mb-4 leading-tight">Connect with Confidence.</h3>
          <p className="text-xl text-gray-200 max-w-lg leading-relaxed">
            Join thousands of users who trust TrackSphere for their daily security and logistical needs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
