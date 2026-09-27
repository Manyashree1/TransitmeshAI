import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Eye, EyeOff } from 'lucide-react';

const demos = [
  ['PASSENGER', 'Passenger', 'passenger@transitai.local'],
  ['DRIVER', 'Driver', 'driver@transitai.local'],
  ['ADMIN', 'Operations', 'admin@transitai.local'],
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
    const u = JSON.parse(localStorage.user);
    nav(loc.state?.from || `/${u.role.toLowerCase()}`);
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
      setError(e.response?.data?.message || 'Unable to authenticate');
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
    } catch (e) {
      setError('Demo login is temporarily unavailable. Please ensure the API is running and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-4">
      <section className="w-full max-w-md">
        <div className="glass-panel p-8">
          <div className="mb-6 mt-1">
            <Logo />
          </div>
          <div className="mb-6">
            <h1 className="heading">
              {register ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              {register
                ? 'Public registration creates a passenger account. Driver accounts are assigned operationally.'
                : 'Sign in to live transit intelligence.'}
            </p>
          </div>
          {error && (
            <div
              className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300"
              role="alert"
            >
              {error}
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            {register && (
              <label className="label">
                Full name
                <input
                  required
                  className="input mt-1"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Priya Passenger"
                />
              </label>
            )}
            <label className="label">
              Email
              <input
                required
                type="email"
                className="input mt-1"
                value={form.email}
                onChange={e =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="you@example.com"
              />
            </label>
            <label className="label">
              Password
              <div className="relative mt-1">
                <input
                  required
                  minLength={6}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  value={form.password}
                  onChange={e =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {register ? 'Creating account…' : 'Signing in…'}
                </span>
              ) : register ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">Demo access</span>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {demos.map(([role, label, email]) => (
                <button
                  key={role}
                  onClick={() => demo(email)}
                  disabled={busy}
                  className="btn-ghost w-full justify-between text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`badge crowd-${role === 'PASSENGER' ? 'LOW' : role === 'DRIVER' ? 'MEDIUM' : 'HIGH'}`}>
                      {label}
                    </span>
                  </span>
                  <span                   className="text-xs text-slate-500 hidden sm:inline">
                    {email}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            {register ? (
              <>
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-[#9AAE8C] hover:text-[#72866D]"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                Need an account?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-[#9AAE8C] hover:text-[#72866D]"
                >
                  Create account
                </Link>
              </>
            )}
          </p>
        </div>
            <p className="mt-4 text-center text-xs text-slate-600">
              TransitAI Mesh · Live transit intelligence
            </p>
      </section>
    </main>
  );
}

