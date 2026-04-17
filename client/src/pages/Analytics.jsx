import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, Activity, ShieldAlert, Battery, MapPin,
  ChevronDown, Download, Loader2, Zap, FileText,
} from 'lucide-react';
import axios from 'axios';

const Analytics = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState(7);
  const [reportLoading, setReportLoading] = useState('');

  const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError('');
        const token = user.token;
        const res = await axios.get(
          `${API_URL}/api/analytics/daily?days=${timeRange}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(res.data.data);
      } catch (err) {
        console.error('Fetch Analytics Error:', err);
        setData(null);
        setError(err.response?.data?.error || err.message || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [API_URL, timeRange, user.token]);

  const handleExportReport = async (range) => {
    const reportWindow = window.open('', '_blank', 'width=1000,height=800');

    if (!reportWindow) {
      alert('Popup blocked. Please allow popups to export the report.');
      return;
    }

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Preparing Report...</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
          </style>
        </head>
        <body>
          <h2>Preparing your report...</h2>
          <p>Please wait while Ksynq generates the printable view.</p>
        </body>
      </html>
    `);
    reportWindow.document.close();

    try {
      setReportLoading(range);
      const token = user.token;
      const res = await axios.get(
        `${API_URL}/api/analytics/report/print?range=${range}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const html = res.data?.data?.html;
      if (!html) {
        throw new Error('Printable report content was not returned.');
      }

      reportWindow.document.open();
      reportWindow.document.write(html);
      reportWindow.document.close();
      reportWindow.focus();
      setTimeout(() => reportWindow.print(), 400);
    } catch (err) {
      reportWindow.close();
      console.error('Export report error:', err);
      alert(err.response?.data?.error || err.message || 'Failed to export report.');
    } finally {
      setReportLoading('');
    }
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="text-gray-500 font-medium animate-pulse">Calculating safety insights...</p>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-red-900">
          <h1 className="text-2xl font-black">Analytics Unavailable</h1>
          <p className="mt-2 text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const totalDistance = (data?.summary?.totalDistance ?? data?.daily?.reduce((acc, curr) => acc + curr.distance, 0) ?? 0).toFixed(2);
  const totalAlerts = data?.summary?.totalAlerts ?? data?.alerts?.reduce((acc, curr) => acc + curr.count, 0) ?? 0;
  const hasDailyData = Array.isArray(data?.daily) && data.daily.length > 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <Activity className="text-primary-600" size={32} />
            Premium Analytics
          </h1>
          <p className="text-gray-500 mt-1 italic">Personalized safety insights with daily and weekly report export.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
          <button
            onClick={() => handleExportReport('daily')}
            disabled={Boolean(reportLoading)}
            className="p-2 bg-white text-primary-700 border border-primary-100 rounded-xl shadow-sm hover:bg-primary-50 transition lg:px-4 flex items-center gap-2 disabled:opacity-60"
          >
            {reportLoading === 'daily' ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
            <span className="hidden lg:inline text-sm font-bold">Daily PDF</span>
          </button>
          <button
            onClick={() => handleExportReport('weekly')}
            disabled={Boolean(reportLoading)}
            className="p-2 bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition lg:px-4 flex items-center gap-2 disabled:opacity-60"
          >
            {reportLoading === 'weekly' ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            <span className="hidden lg:inline text-sm font-bold">Weekly PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Distance', value: `${totalDistance} km`, icon: <MapPin />, color: 'blue' },
          { label: 'Safety Alerts', value: totalAlerts, icon: <ShieldAlert />, color: 'red' },
          { label: 'Avg Battery', value: `${data?.summary?.averageBattery || data?.daily?.[0]?.battery || 0}%`, icon: <Battery />, color: 'green' },
          { label: 'Active Days', value: data?.summary?.activeDays || 0, icon: <TrendingUp />, color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-50 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              stat.color === 'red' ? 'bg-red-50 text-red-600' :
              stat.color === 'green' ? 'bg-green-50 text-green-600' :
              'bg-amber-50 text-amber-600'
            }`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-50 dark:border-gray-700 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-600" />
              Activity Trend (km)
            </h3>
            <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <ChevronDown size={14} className="rotate-180" />
              Report-ready summary
            </div>
          </div>
          <div className="h-[300px] w-full">
            {hasDailyData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.daily}>
                  <defs>
                    <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="distance" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorDist)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-medium text-gray-400">
                No movement data recorded for this period.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-50 dark:border-gray-700 shadow-xl overflow-hidden">
          <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight mb-8">Alert Frequency</h3>
          <div className="h-[300px] w-full flex flex-col items-center">
            <ResponsiveContainer width="100%" height="70%">
              <PieChart>
                <Pie
                  data={data?.alerts || [{ _id: 'None', count: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {(data?.alerts || [{ _id: 'None', count: 1 }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full mt-4 space-y-2">
              {data?.alerts?.map((alert, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-500 uppercase">{alert._id}</span>
                  </div>
                  <span className="text-gray-900 dark:text-white">{alert.count}</span>
                </div>
              ))}
              {(!data?.alerts || data.alerts.length === 0) && (
                <p className="text-center text-xs text-gray-400 italic">No alerts in this period</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-50 dark:border-gray-700 shadow-xl">
        <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight mb-8 flex items-center gap-2">
          <Battery size={20} className="text-green-600" />
          Battery Performance (%)
        </h3>
        <div className="h-[200px] w-full">
          {hasDailyData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.daily}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip />
                <Line type="monotone" dataKey="battery" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm font-medium text-gray-400">
              Battery trends will appear after location history is collected.
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="z-10 text-center md:text-left">
          <h3 className="text-2xl font-black mb-1">Reports System Ready</h3>
          <p className="text-primary-100 italic">Export daily and weekly tracking summaries through your browser print-to-PDF flow.</p>
        </div>
        <button
          onClick={() => handleExportReport('weekly')}
          className="z-10 bg-white text-primary-600 px-8 py-4 rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-primary-50 transition flex items-center gap-2"
        >
          <Zap size={18} />
          Export Weekly PDF
        </button>
      </div>
    </div>
  );
};

export default Analytics;
