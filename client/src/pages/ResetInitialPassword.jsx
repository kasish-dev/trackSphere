import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { Key, Loader2 } from 'lucide-react';
import { syncUserSession } from '../redux/authSlice';

const ResetInitialPassword = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { newPassword, confirmPassword } = formData;
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const { data } = await axios.post(
        `${API_URL}/api/auth/force-reset-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      // Update local storage and redux state with new user object
      const updatedLocalStorage = { ...user, user: data.data };
      localStorage.setItem('user', JSON.stringify(updatedLocalStorage));
      dispatch(syncUserSession(data.data));

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 bg-white dark:bg-gray-950">
      <div className="flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96 text-center">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <Key className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Set Your Password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            For security reasons, you must change the temporary password provided by your administrator.
          </p>

          <div className="mt-8">
            <form className="space-y-6 text-left" onSubmit={onSubmit}>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <input
                  name="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={onChange}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={onChange}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetInitialPassword;
