import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  ShieldAlert,
  Zap,
  Users,
  ArrowRight,
  Navigation,
  CheckCircle2,
  MessageSquare,
  Receipt,
  BriefcaseBusiness,
} from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const features = [
    {
      title: 'Real-Time Tracking',
      desc: 'Real-time plus offline sync for employees, families, and fleet-style operations.',
      icon: <MapPin className="text-primary-500" />,
      box: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'SOS + Safety',
      desc: 'Built-in SOS workflows, emergency contacts, and anomaly detection from the same platform.',
      icon: <ShieldAlert className="text-red-500" />,
      box: 'bg-red-50 dark:bg-red-900/20'
    },
    {
      title: 'Employee Tracking',
      desc: 'Auto check-in/check-out, work hours, movement tracking, and attendance-ready summaries.',
      icon: <BriefcaseBusiness className="text-amber-500" />,
      box: 'bg-amber-50 dark:bg-amber-900/20'
    },
    {
      title: 'Billing + Reports',
      desc: 'Invoices, billing history, PDF-style printable reports, and subscription plans built in.',
      icon: <Receipt className="text-green-500" />,
      box: 'bg-green-50 dark:bg-green-900/20'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen overflow-x-hidden">
      <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-2 rounded-xl">
              <Navigation className="text-white" size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter">Ksynq</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-500 dark:text-gray-400">
            <a href="#features" className="hover:text-primary-600 transition">Features</a>
            <a href="#pricing" className="hover:text-primary-600 transition">Pricing</a>
            <Link to="/login" className="hover:text-primary-600 transition">Login</Link>
            <Link to="/register" className="bg-primary-600 text-white px-6 py-3 rounded-full hover:bg-primary-700 transition shadow-lg shadow-primary-500/20">
              Start 7-Day Trial
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-40 pb-20 px-6 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto text-center">
          <motion.div {...fadeIn}>
            <span className="bg-primary-50 dark:bg-primary-900/30 text-primary-600 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-primary-100 dark:border-primary-800">
              Free 7-Day Trial
            </span>
            <h1 className="text-5xl md:text-8xl font-black mt-8 leading-[1.1] tracking-tight">
              Tracking For Teams. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">Safety For Real Operations.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 mt-8 max-w-4xl mx-auto font-medium">
              Ksynq helps delivery businesses, sales teams, security agencies, fleet operators, and families manage live tracking, SOS alerts, work hours, and billing from one SaaS platform.
            </p>
            <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full md:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-10 py-5 rounded-2xl font-black text-lg shadow-2xl hover:scale-105 transition flex items-center justify-center gap-2 group">
                Start Free 7-Day Trial <ArrowRight size={20} className="group-hover:translate-x-1 transition" />
              </Link>
              <Link to="/login" className="w-full md:w-auto bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 px-10 py-5 rounded-2xl font-black text-lg hover:bg-gray-50 transition flex items-center justify-center gap-2">
                Login
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-20 relative px-4"
          >
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-[3rem] border-8 border-white dark:border-gray-700 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden max-w-5xl mx-auto">
              <img
                src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2000"
                alt="Dashboard Preview"
                className="rounded-[2rem] w-full"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-primary-500/20">
            <h2 className="text-3xl font-black mb-3">Start with a real account and begin tracking in minutes.</h2>
            <p className="text-primary-100 max-w-2xl">
              Create your workspace, invite your team or family members, and use live tracking, SOS, geofences, and attendance tools from day one.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/register" className="bg-white/10 border border-white/20 text-white px-5 py-3 rounded-2xl font-black text-sm hover:bg-white/20 transition">
                Create Account
              </Link>
              <Link to="/login" className="bg-white text-primary-700 px-5 py-3 rounded-2xl font-black text-sm hover:bg-primary-50 transition">
                Login
              </Link>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 p-8 shadow-sm">
            <h3 className="text-xl font-black mb-4">What you can do first</h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>Create a secure account for yourself or your business.</p>
              <p>Add emergency contacts and test SOS with your real location.</p>
              <p>Invite members, create groups, and start live tracking.</p>
              <p>Enable geofences and attendance-ready movement summaries.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-4">Built To Earn And Scale</h2>
            <p className="text-gray-500 font-medium">Business-ready features for Indian pricing, team operations, and real safety workflows.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition group"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition ${f.box}`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-4 italic">Clear Pricing For Growth</h2>
            <p className="text-gray-500 font-medium">Start free, convert on trial, and upgrade as teams and fleets expand.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] border-2 border-gray-50 dark:border-gray-700 flex flex-col">
              <h3 className="text-2xl font-bold mb-2">FREE</h3>
              <p className="text-gray-400 text-sm mb-6 uppercase tracking-widest font-bold">Entry Plan</p>
              <div className="text-5xl font-black mb-10">Rs 0 <span className="text-lg text-gray-400">/mo</span></div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400"><CheckCircle2 size={18} className="text-primary-500" /> 1 group</li>
                <li className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400"><CheckCircle2 size={18} className="text-primary-500" /> Limited tracking</li>
                <li className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400"><CheckCircle2 size={18} className="text-primary-500" /> 1-day history</li>
              </ul>
              <Link to="/register" className="w-full py-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-black text-center text-sm shadow-sm hover:bg-gray-100 transition">
                Start Free
              </Link>
            </div>

            <div className="bg-primary-600 p-10 rounded-[3rem] text-white flex flex-col relative scale-105 shadow-2xl shadow-primary-500/30">
              <div className="absolute top-6 right-8 bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">Most Popular</div>
              <h3 className="text-2xl font-bold mb-2">PRO</h3>
              <p className="text-primary-100 text-sm mb-6 uppercase tracking-widest font-bold">Advanced Safety</p>
              <div className="text-5xl font-black mb-10">Rs 499 <span className="text-lg text-primary-200">/mo</span></div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 size={18} className="text-white" /> Up to 5 members</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 size={18} className="text-white" /> 30-day history</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 size={18} className="text-white" /> Geofencing + SOS</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 size={18} className="text-white" /> Employee tracking</li>
              </ul>
              <Link to="/register" className="w-full py-4 bg-white text-primary-600 rounded-2xl font-black text-center text-sm shadow-xl hover:bg-primary-50 transition border border-white">
                Start Trial
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] border-2 border-gray-50 dark:border-gray-700 flex flex-col">
              <h3 className="text-2xl font-bold mb-2">BUSINESS</h3>
              <p className="text-gray-400 text-sm mb-6 uppercase tracking-widest font-bold">Operations Plan</p>
              <div className="text-5xl font-black mb-10">Rs 999 <span className="text-lg text-gray-400">/mo</span></div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400"><CheckCircle2 size={18} className="text-primary-500" /> Up to 15 members</li>
                <li className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400"><CheckCircle2 size={18} className="text-primary-500" /> Admin dashboard</li>
                <li className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400"><CheckCircle2 size={18} className="text-primary-500" /> Reports & analytics</li>
                <li className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400"><CheckCircle2 size={18} className="text-primary-500" /> Billing & invoices</li>
              </ul>
              <Link to="/register" className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-center text-sm shadow-xl hover:opacity-90 transition">
                Upgrade Business
              </Link>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 p-10 rounded-[3rem] border-2 border-amber-100 dark:border-amber-800 flex flex-col">
              <h3 className="text-2xl font-bold mb-2">ENTERPRISE</h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm mb-6 uppercase tracking-widest font-bold">White Label</p>
              <div className="text-4xl font-black mb-10">Custom Pricing</div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-bold text-amber-900 dark:text-amber-200"><CheckCircle2 size={18} className="text-amber-600" /> Unlimited users</li>
                <li className="flex items-center gap-3 text-sm font-bold text-amber-900 dark:text-amber-200"><CheckCircle2 size={18} className="text-amber-600" /> White-label setup</li>
                <li className="flex items-center gap-3 text-sm font-bold text-amber-900 dark:text-amber-200"><CheckCircle2 size={18} className="text-amber-600" /> Dedicated support</li>
                <li className="flex items-center gap-3 text-sm font-bold text-amber-900 dark:text-amber-200"><CheckCircle2 size={18} className="text-amber-600" /> Custom rollout</li>
              </ul>
              <Link to="/register" className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-center text-sm shadow-xl hover:bg-amber-700 transition">
                Talk To Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto rounded-[3rem] bg-gray-900 text-white p-10 md:p-14 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-widest text-primary-300 mb-3">Get Started</p>
            <h2 className="text-3xl md:text-5xl font-black leading-tight">Launch a free 7-day trial and set up your live tracking workspace today.</h2>
            <p className="text-gray-300 mt-4 text-lg">
              Built for local business operations, family safety use cases, and fleet coordination with real users and real routes.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <Link to="/register" className="bg-white text-gray-900 px-8 py-4 rounded-2xl font-black text-center hover:bg-gray-100 transition">
              Start Free Trial
            </Link>
            <Link to="/login" className="bg-white/10 border border-white/20 text-white px-8 py-4 rounded-2xl font-black text-center hover:bg-white/20 transition">
              Login
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-20 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Navigation className="text-primary-600" size={24} />
              <span className="text-2xl font-black tracking-tighter">Ksynq</span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs">Business-ready live tracking, billing, attendance, and SOS workflows in one SaaS product.</p>
          </div>
          <div className="flex gap-10 text-sm font-bold text-gray-400">
            <a href="#pricing" className="hover:text-primary-600 transition">Pricing</a>
            <Link to="/login" className="hover:text-primary-600 transition">Login</Link>
          </div>
          <p className="text-xs text-gray-400 font-medium italic">© 2026 Ksynq SaaS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
