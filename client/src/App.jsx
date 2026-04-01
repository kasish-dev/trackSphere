import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Groups from './pages/Groups';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import Upgrade from './pages/Upgrade';
import Notifications from './pages/Notifications';
import Success from './pages/Success';
import Analytics from './pages/Analytics';
import PublicSOS from './pages/PublicSOS';
import Admin from './pages/Admin';
import Billing from './pages/Billing';
import Layout from './layouts/Layout';
import { validateSession } from './redux/authSlice';

const SessionLoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-300">
    Validating your session...
  </div>
);

const HomeRoute = () => {
  const { user, sessionChecked } = useSelector((state) => state.auth);

  if (user?.token && !sessionChecked) {
    return <SessionLoadingScreen />;
  }

  return user ? <Navigate to="/dashboard" replace /> : <Home />;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, sessionChecked } = useSelector((state) => state.auth);

  if (user?.token && !sessionChecked) {
    return <SessionLoadingScreen />;
  }

  return user ? <Navigate to="/dashboard" replace /> : children;
};

// Protected Route Component
const ProtectedRoute = () => {
  const { user, sessionChecked } = useSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!sessionChecked) {
    return <SessionLoadingScreen />;
  }

  return <Outlet />;
};

const AdminOnlyRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);

  if (user?.user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const BusinessOnlyRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const tier = user?.user?.subscriptionTier;
  const isAllowed = user?.user?.role === 'admin' || tier === 'BUSINESS' || tier === 'ENTERPRISE';

  return isAllowed ? children : <Navigate to="/upgrade" replace />;
};

const BillingManagerRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const tier = user?.user?.subscriptionTier;
  const isWorkspaceEmployee = user?.user?.role !== 'admin'
    && user?.user?.accountType !== 'business_owner'
    && (tier === 'BUSINESS' || tier === 'ENTERPRISE');

  return isWorkspaceEmployee ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  const dispatch = useDispatch();
  const { user, sessionChecked } = useSelector((state) => state.auth);
  const sessionValidationStarted = useRef(false);

  useEffect(() => {
    if (!user?.token || sessionChecked || sessionValidationStarted.current) {
      return;
    }

    sessionValidationStarted.current = true;
    dispatch(validateSession());
  }, [dispatch, sessionChecked, user]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />
          <Route path="/sos/:token" element={<PublicSOS />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:groupId" element={<Chat />} />
              <Route path="/history" element={<History />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route
                path="/upgrade"
                element={
                  <BillingManagerRoute>
                    <Upgrade />
                  </BillingManagerRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <BusinessOnlyRoute>
                    <Analytics />
                  </BusinessOnlyRoute>
                }
              />
              <Route
                path="/billing"
                element={
                  <BillingManagerRoute>
                    <Billing />
                  </BillingManagerRoute>
                }
              />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="/admin"
                element={
                  <AdminOnlyRoute>
                    <Admin />
                  </AdminOnlyRoute>
                }
              />
            </Route>
            <Route path="/success" element={<Success />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
