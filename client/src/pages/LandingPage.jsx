import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Users,
  Zap,
  ArrowRight,
  Bus,
  Clock,
  MapPin,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Radio,
  Sparkles,
} from 'lucide-react';

const corridors = [
  { id: '12', name: 'Central Station → Riverside', buses: 2, nextEta: '3 min', seats: 24, crowd: 'LOW', code: 'Line 12' },
  { id: '24', name: 'Railway Station → Tech Park', buses: 2, nextEta: '6 min', seats: 12, crowd: 'MEDIUM', code: 'Line 24' },
  { id: '31', name: 'Hebbal → Greenfield', buses: 1, nextEta: '11 min', seats: 4, crowd: 'HIGH', code: 'Line 31' },
  { id: '44', name: 'Chamundi Connector', buses: 1, nextEta: '5 min', seats: 18, crowd: 'LOW', code: 'Line 44' },
];

export default function LandingPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [loggingIn, setLoggingIn] = useState('');
  const [selectedCorridor, setSelectedCorridor] = useState(corridors[0]);

  const handleInstantDemo = async (email, path) => {
    setLoggingIn(email);
    try {
      await login({ email, password: 'Transit123!' });
      nav(path);
    } catch {
      nav('/login');
    } finally {
      setLoggingIn('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <Logo />
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="btn-primary text-xs sm:text-sm px-4 py-2"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-12 pb-16 lg:pt-16 lg:pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:20px_20px] opacity-35 pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-5">
              {/* Live Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/90 px-3.5 py-1 text-xs font-bold text-blue-700 shadow-2xs">
                <span className="live-dot" />
                <span>Live Fleet Radar · Mysuru Transit System</span>
              </div>

              {/* Bold Tagline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08]">
                Live bus tracking. <br className="hidden sm:inline" />
                <span className="text-blue-600">Zero guesswork.</span>
              </h1>

              {/* Punchy Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 font-medium max-w-xl mx-auto">
                Real-time GPS telemetry, conductor ticket counts, and live seat availability at your fingertips.
              </p>

              {/* Direct Instant Action */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleInstantDemo('passenger@transitai.local', '/passenger')}
                  disabled={!!loggingIn}
                  className="btn-primary text-sm px-6 py-3.5 shadow-md shadow-blue-500/25 flex items-center gap-2 group cursor-pointer"
                >
                  <Bus className="h-4 w-4" />
                  <span>{loggingIn === 'passenger@transitai.local' ? 'Connecting…' : 'Track Buses Live'}</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <Link
                  to="/login"
                  className="btn-secondary text-sm px-6 py-3.5 cursor-pointer font-bold"
                >
                  Sign In to Account
                </Link>
              </div>

              {/* High-Impact Stat Pills */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <Radio className="h-3.5 w-3.5 text-blue-600" /> 5s GPS Frequency
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Conductor ETM Fusion
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <Activity className="h-3.5 w-3.5 text-emerald-600" /> 6 Active Corridors
                </span>
              </div>
            </div>

            {/* Interactive Live Corridor Selector Preview */}
            <div className="mt-12 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Live Corridor Radar (Click to preview)
                    </span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                    Simulated Network Active
                  </span>
                </div>

                {/* Corridor Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  {corridors.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCorridor(c)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedCorridor.id === c.id
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <p className="text-xs font-black">{c.code}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{c.name.split('→')[1] || c.name}</p>
                    </button>
                  ))}
                </div>

                {/* Corridor Live Details Strip */}
                <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">{selectedCorridor.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedCorridor.crowd === 'LOW' ? 'bg-emerald-100 text-emerald-800' :
                        selectedCorridor.crowd === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {selectedCorridor.crowd} LOAD
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                      <span>Next arrival in <strong className="text-slate-900 font-bold">{selectedCorridor.nextEta}</strong></span>
                      <span>·</span>
                      <span className="text-emerald-700 font-bold">{selectedCorridor.seats} seats available</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleInstantDemo('passenger@transitai.local', '/passenger')}
                    className="btn-primary text-xs px-4 py-2.5 shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <span>View on Live Map</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Click-Ready Personas */}
        <section className="py-14 bg-slate-50 border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Instant Access</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Explore as any user with 1 click
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {/* Persona 1: Commuter */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                      COMMUTER
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">Passenger Hub</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Corridor routing, live GPS tracking, ETM seat meters & crowd voting.
                  </p>
                </div>
                <button
                  onClick={() => handleInstantDemo('passenger@transitai.local', '/passenger')}
                  disabled={!!loggingIn}
                  className="btn-primary w-full mt-6 text-xs justify-center font-bold py-2.5"
                >
                  {loggingIn === 'passenger@transitai.local' ? 'Entering…' : 'Enter as Passenger'}
                </button>
              </div>

              {/* Persona 2: Driver */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Bus className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                      DRIVER / CAB
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">Driver Cockpit</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Trip controls, offline-resilient conductor ETM ticketing & delay alerts.
                  </p>
                </div>
                <button
                  onClick={() => handleInstantDemo('driver@transitai.local', '/driver')}
                  disabled={!!loggingIn}
                  className="btn-primary w-full mt-6 text-xs justify-center font-bold py-2.5 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                >
                  {loggingIn === 'driver@transitai.local' ? 'Entering…' : 'Enter as Driver'}
                </button>
              </div>

              {/* Persona 3: Ops Admin */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Activity className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      DISPATCH
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">Operations Console</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Citywide fleet KPIs, live delay monitoring, and corridor performance.
                  </p>
                </div>
                <button
                  onClick={() => handleInstantDemo('admin@transitai.local', '/admin')}
                  disabled={!!loggingIn}
                  className="btn-secondary w-full mt-6 text-xs justify-center font-bold py-2.5"
                >
                  {loggingIn === 'admin@transitai.local' ? 'Entering…' : 'Enter as Operations'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Compact Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900">TransitMesh.ai</span>
            <span>· Live Municipal Mobility Platform</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link to="/login" className="hover:text-blue-600">Sign In</Link>
            <Link to="/register" className="hover:text-blue-600">Create Account</Link>
            <span className="text-slate-400">Mysuru Fleet Network</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
