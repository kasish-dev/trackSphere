import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Check, Zap, Shield, Crown, Building2, Loader2, Clock3, Receipt, ExternalLink } from 'lucide-react';
import { syncUserSession } from '../redux/authSlice';
import { startPlanCheckout, fetchPaymentHistory, openInvoicePrintView, logPaymentFailure } from '../services/paymentService';

const Upgrade = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(null);
  const [notice, setNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');
  const [payments, setPayments] = useState([]);
  const [billingLoading, setBillingLoading] = useState(true);

  const trialEndsAt = user?.user?.trialEndsAt ? new Date(user.user.trialEndsAt) : null;
  const trialActive = user?.user?.trialStatus === 'active' && trialEndsAt && trialEndsAt > new Date();
  const trialDaysLeft = trialActive
    ? Math.max(1, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  useEffect(() => {
    const loadPayments = async () => {
      try {
        setBillingLoading(true);
        const history = await fetchPaymentHistory({ authUser: user });
        setPayments(history);
      } catch (err) {
        console.error('Billing history error:', err);
      } finally {
        setBillingLoading(false);
      }
    };

    if (user?.token) {
      loadPayments();
    }
  }, [user]);

  const plans = [
    {
      id: 'free',
      name: 'FREE',
      price: 'Rs 0',
      description: 'For basic individual safety use.',
      features: ['1 group', 'Limited tracking', '1-day history', 'Basic chat access'],
      color: 'gray',
      icon: <Shield size={24} />,
      isCurrent: user?.user?.subscriptionTier === 'FREE',
    },
    {
      id: 'pro',
      name: 'PRO',
      price: 'Rs 499',
      period: '/mo',
      description: 'Best for teams that need stronger live safety features.',
      features: ['Up to 5 members', '30-day history', 'Geofencing + SOS', 'Premium safety workflows', 'Priority upgrade path'],
      color: 'primary',
      icon: <Zap size={24} />,
      isCurrent: user?.user?.subscriptionTier === 'PRO',
      highlight: true,
    },
    {
      id: 'business',
      name: 'BUSINESS',
      price: 'Rs 999',
      period: '/mo',
      description: 'Built for operational tracking and business oversight.',
      features: ['Up to 15 members', 'Admin dashboard', 'Reports & analytics', 'Better team visibility', 'Business-ready management'],
      color: 'purple',
      icon: <Crown size={24} />,
      isCurrent: user?.user?.subscriptionTier === 'BUSINESS',
    },
  ];

  const handleUpgrade = async (plan) => {
    if (plan.id === 'free') {
      return;
    }

    setLoading(plan.id);
    setNotice('');
    setErrorNotice('');

    try {
      const result = await startPlanCheckout({
        plan,
        authUser: user,
        onVerified: (verificationData) => {
          const updatedUser = verificationData?.user;
          if (updatedUser) {
            dispatch(syncUserSession(updatedUser));
          }
        },
      });

      if (result?.checkoutMode === 'mock') {
        setNotice('Razorpay is running in mock mode because payment keys are not configured on the server. The plan was upgraded using the local demo payment path.');
      } else if (result?.checkoutMode === 'test' || result?.mode === 'test') {
        setNotice('Razorpay test mode is enabled. Use Razorpay test credentials to complete checkout safely without charging a real card.');
      }

      const history = await fetchPaymentHistory({ authUser: user });
      setPayments(history);

      alert(
        result?.checkoutMode === 'mock' || result?.mode === 'mock'
          ? `Successfully upgraded to ${plan.name} in demo mode.`
          : result?.checkoutMode === 'test' || result?.mode === 'test'
            ? `Successfully upgraded to ${plan.name} in Razorpay test mode.`
          : `Successfully upgraded to ${plan.name}.`
      );
    } catch (err) {
      console.error('Payment initialization failed:', err);
      if (err.message !== 'Payment cancelled') {
        const failureMessage = err.response?.data?.error || err.message || 'Failed to start payment. Please check your connection.';
        setErrorNotice(failureMessage);
        try {
          await logPaymentFailure({
            authUser: user,
            planId: plan.id,
            reason: failureMessage,
            status: 'failed',
          });
          const history = await fetchPaymentHistory({ authUser: user });
          setPayments(history);
        } catch (loggingError) {
          console.error('Unable to persist payment failure:', loggingError);
        }
      } else {
        setErrorNotice('Payment was cancelled before completion. A failed billing attempt has been recorded for review.');
        const history = await fetchPaymentHistory({ authUser: user });
        setPayments(history);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">Choose Your Safety Plan</h1>
        <p className="text-gray-500 max-w-2xl mx-auto italic">Clear pricing, free-trial awareness, and upgrade paths for individual users and businesses.</p>
      </div>

      {trialActive && (
        <div className="mb-8 rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock3 size={22} />
          </div>
          <div>
            <p className="font-black text-lg">7-Day Free Trial Active</p>
            <p className="text-sm mt-1">
              You currently have PRO access through your free trial. {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left before premium features are restricted.
            </p>
          </div>
        </div>
      )}

      {notice && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900">
          {notice}
        </div>
      )}

      {errorNotice && (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-900">
          {errorNotice}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-300 ${
              plan.highlight
                ? 'border-primary-500 shadow-2xl shadow-primary-500/10 scale-105 z-10'
                : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            } bg-white dark:bg-gray-800 flex flex-col`}
          >
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                Recommended
              </div>
            )}

            <div
              className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center ${
                plan.color === 'primary'
                  ? 'bg-primary-50 text-primary-600'
                  : plan.color === 'purple'
                    ? 'bg-purple-50 text-purple-600'
                    : 'bg-gray-50 text-gray-600'
              }`}
            >
              {plan.icon}
            </div>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-black text-gray-900 dark:text-white">{plan.price}</span>
              {plan.period && <span className="text-gray-400 font-bold">{plan.period}</span>}
            </div>
            <p className="text-sm text-gray-500 mb-8">{plan.description}</p>

            <div className="space-y-4 mb-8 flex-grow">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 font-medium">
                  <div className="w-5 h-5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center">
                    <Check size={12} />
                  </div>
                  {feature}
                </div>
              ))}
            </div>

            <button
              onClick={() => handleUpgrade(plan)}
              disabled={plan.isCurrent || Boolean(loading)}
              className={`w-full py-4 rounded-2xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                plan.isCurrent
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : plan.highlight
                    ? 'bg-primary-600 text-white shadow-xl hover:bg-primary-700'
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
              }`}
            >
              {loading === plan.id ? <Loader2 className="animate-spin" /> : null}
              {plan.isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Pricing Snapshot</h2>
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50/70 dark:bg-gray-900/40">
            <div className="font-black text-gray-900 dark:text-white">FREE</div>
            <div className="text-gray-500 mt-2">1 group</div>
            <div className="text-gray-500">Limited tracking</div>
            <div className="text-gray-500">1-day history</div>
          </div>
          <div className="rounded-2xl border border-primary-100 p-4 bg-primary-50/70 dark:bg-primary-900/10">
            <div className="font-black text-gray-900 dark:text-white">PRO</div>
            <div className="text-gray-500 mt-2">Rs 499/month</div>
            <div className="text-gray-500">Up to 5 members</div>
            <div className="text-gray-500">30-day history</div>
          </div>
          <div className="rounded-2xl border border-purple-100 p-4 bg-purple-50/70 dark:bg-purple-900/10">
            <div className="font-black text-gray-900 dark:text-white">BUSINESS</div>
            <div className="text-gray-500 mt-2">Rs 999/month</div>
            <div className="text-gray-500">Up to 15 members</div>
            <div className="text-gray-500">Admin + reports</div>
          </div>
          <div className="rounded-2xl border border-amber-100 p-4 bg-amber-50/70 dark:bg-amber-900/10">
            <div className="font-black text-gray-900 dark:text-white">ENTERPRISE</div>
            <div className="text-gray-500 mt-2">Custom pricing</div>
            <div className="text-gray-500">Unlimited users</div>
            <div className="text-gray-500">White-label support</div>
          </div>
        </div>
      </div>

      <div className="mt-10 bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 p-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Billing History</h2>
            <p className="text-sm text-gray-500 mt-1">Invoices and payment records for your account.</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <Receipt size={22} />
          </div>
        </div>

        {billingLoading ? (
          <div className="py-10 text-center text-gray-400">Loading invoices...</div>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center text-gray-400">No invoices yet. Your paid plans will appear here.</div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{payment.planName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Invoice {payment.invoiceNumber} • {new Date(payment.paidAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {payment.amount} {payment.currency} • {payment.mode} • {payment.provider}
                  </p>
                </div>
                <button
                  onClick={() => openInvoicePrintView({ authUser: user, invoiceId: payment.id })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-200 px-4 py-2 text-sm font-bold text-primary-700 transition hover:bg-primary-50"
                >
                  <ExternalLink size={14} />
                  Open Invoice
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-16 bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-800/50 flex flex-col md:flex-row items-center gap-8">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
          <Building2 size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">TrackSphere For Business</h3>
          <p className="text-sm text-gray-500 mb-4 italic">Need business setup, white-label delivery, or larger operations support? We can package admin workflows and rollout help.</p>
          <button className="text-sm font-bold text-blue-600 hover:underline">Contact Sales -&gt;</button>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;
