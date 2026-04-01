import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Receipt, ExternalLink, Loader2, XCircle, CheckCircle2, Clock3 } from 'lucide-react';
import { fetchPaymentHistory, openInvoicePrintView } from '../services/paymentService';

const Billing = () => {
  const { user } = useSelector((state) => state.auth);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState('');

  useEffect(() => {
    const loadPayments = async () => {
      try {
        setLoading(true);
        const history = await fetchPaymentHistory({ authUser: user });
        setPayments(history);
      } catch (err) {
        console.error('Billing history error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) {
      loadPayments();
    }
  }, [user]);

  const getStatusBadge = (status) => {
    if (status === 'paid') {
      return <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 border border-green-100"><CheckCircle2 size={12} /> Paid</span>;
    }
    if (status === 'pending') {
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-100"><Clock3 size={12} /> Pending</span>;
    }
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-100"><XCircle size={12} /> Failed</span>;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <Receipt className="text-primary-600" size={30} />
            Billing
          </h1>
          <p className="text-gray-500 mt-1">Review invoices, payment history, and failed billing attempts.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-gray-400"><Loader2 className="mx-auto mb-3 animate-spin" />Loading billing history...</div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No billing records available yet.</div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-black text-gray-900 dark:text-white">{payment.planName}</p>
                    {getStatusBadge(payment.status)}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Invoice {payment.invoiceNumber}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {payment.amount} {payment.currency} • {payment.provider} • {payment.mode}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(payment.paidAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  {payment.status === 'paid' && (
                    <button
                      onClick={async () => {
                        try {
                          setInvoiceLoading(payment.id);
                          await openInvoicePrintView({ authUser: user, invoiceId: payment.id });
                        } catch (err) {
                          alert(err.message || 'Failed to open invoice');
                        } finally {
                          setInvoiceLoading('');
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-primary-200 px-4 py-2 text-sm font-bold text-primary-700 transition hover:bg-primary-50"
                    >
                      {invoiceLoading === payment.id ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                      Open Invoice
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Billing;
