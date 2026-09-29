import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Eye, EyeOff, Users, Bus, BarChart3, ArrowRight, Sparkles } from 'lucide-react';

const demos = [
  { role: 'PASSENGER', label: 'Passenger', email: 'passenger@transitai.local', desc: 'Commute routing & crowd reporting', icon: Users, badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { role: 'DRIVER', label: 'Driver', email: 'driver@transitai.local', desc: 'Trip execution & ETM ticketing', icon: Bus, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { role: 'ADMIN', label: 'Operations Admin', email: 'admin@transitai.local', desc: 'Fleet overview & delay telemetry', icon: BarChart3, badge: 'bg-purple-50 text-purple-700 border-purple-200' },
];

export default function AuthPage({ initialRegister = false }) {
  const [register, setRegister] = useState(initialRegister);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register: signup } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const finish = () => {
    try {
      const u = JSON.parse(localStorage.user);
      nav(loc.state?.from || `/${u.role.toLowerCase()}`);
    } catch {
      nav('/passenger');
    }
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (register) await signup(form);
      else await login(form);
      finish();
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to authenticate. Please verify credentials.');
    } finally {
      setBusy(false);
    }
  };

  const demo = async email => {
    setBusy(true);
    setError('');
    try {
      await login({ email, password: 'Transit123!' });
      finish();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8 selection:bg-blue-100 selection:text-blue-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Logo />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {register ? 'Create Passenger Account' : 'Sign in to TransitMesh'}
        </h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Real-time municipal fleet tracking and live transit intelligence
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-7 px-6 sm:px-8 border border-slate-200/90 shadow-md rounded-2xl">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 mb-6">
            <button
              type="button"
              onClick={() => { setRegister(false); setError(''); }}
              className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                !register ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setRegister(true); setError(''); }}
              className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                register ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              New Account
            </button>
          </div>

          {error && (
            <div
              className="mb-5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs font-semibold text-rose-800"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {register && (
              <div>
                <label className="label">Full Name</label>
                <input
                  required
                  className="input font-medium"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Priya Passenger"
                />
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <input
                required
                type="email"
                className="input font-medium"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="passenger@transitai.local"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  required
                  minLength={6}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10 font-medium"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full text-sm font-black py-2.5 mt-2 cursor-pointer"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {register ? 'Creating account…' : 'Signing in…'}
                </span>
              ) : register ? (
                'Create Passenger Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2.5 text-slate-400 font-extrabold tracking-wider text-[10px]">
                  Instant Demo Access (1 Click)
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {demos.map(({ role, label, email, desc, icon: Icon, badge }) => (
                <button
                  key={role}
                  onClick={() => demo(email)}
                  disabled={busy}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex items-center justify-between text-left cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badge}`}>
                          {role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 font-medium">
          TransitMesh AI · High-Frequency Municipal Fleet Tracking
        </p>
      </div>
    </main>
  );
}
