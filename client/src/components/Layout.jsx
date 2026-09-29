import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { Menu, X, LogOut, WifiOff, Users, Bus, BarChart3, ShieldCheck, ArrowRightLeft } from 'lucide-react';

const links = {
  PASSENGER: [{ to: '/passenger', label: 'Commuter Hub', icon: Users }],
  DRIVER: [{ to: '/driver', label: 'Driver Cockpit', icon: Bus }],
  ADMIN: [{ to: '/admin', label: 'Operations Console', icon: BarChart3 }],
};

const roleLabel = {
  PASSENGER: 'Passenger',
  DRIVER: 'Driver',
  ADMIN: 'Operations Admin',
};

export default function Layout() {
  const { user, logout, login } = useAuth();
  const nav = useNavigate();
  const [online, setOnline] = useState(navigator.onLine);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const handleLogout = () => {
    logout();
    nav('/');
  };

  const switchRole = async (targetEmail, targetPath) => {
    try {
      await login({ email: targetEmail, password: 'Transit123!' });
      nav(targetPath);
      setSidebarOpen(false);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost md:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Logo to={`/${user.role.toLowerCase()}`} />
          </div>

          <div className="flex items-center gap-3">
            {/* Live Network Health Status */}
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                online
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : 'bg-rose-50 text-rose-700 border border-rose-200/80'
              }`}
              title={online ? 'Real-time telemetry stream connected' : 'Offline — local cache active'}
            >
              {online ? (
                <>
                  <span className="live-dot" />
                  <span className="hidden sm:inline">Network Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            {/* User Profile Badge */}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                {user.name.charAt(0)}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight">{user.name}</span>
                <span className="text-[10px] font-medium text-slate-500 leading-tight">
                  {roleLabel[user.role] || user.role}
                </span>
              </div>
            </div>

            <button
              aria-label="Sign out"
              className="btn-ghost text-xs font-medium px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6">
        <aside
          className={`${
            sidebarOpen
              ? 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs p-4 md:relative md:inset-auto md:z-auto md:p-0'
              : 'hidden'
          } md:block md:w-60 shrink-0`}
        >
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-sm md:sticky md:top-20 space-y-4">
            <div>
              <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Navigation</p>
              <nav className="space-y-1">
                {links[user.role]?.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-current" />}
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Quick Role Switcher for seamless demo testing */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3 w-3" /> Switch Role
                </span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => switchRole('passenger@transitai.local', '/passenger')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                    user.role === 'PASSENGER'
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>Passenger View</span>
                  {user.role === 'PASSENGER' && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                </button>
                <button
                  onClick={() => switchRole('driver@transitai.local', '/driver')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                    user.role === 'DRIVER'
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>Driver Cockpit</span>
                  {user.role === 'DRIVER' && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                </button>
                <button
                  onClick={() => switchRole('admin@transitai.local', '/admin')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                    user.role === 'ADMIN'
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>Operations Console</span>
                  {user.role === 'ADMIN' && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                </button>
              </div>
            </div>

            {sidebarOpen && (
              <button
                className="btn-secondary w-full md:hidden mt-2 text-xs"
                onClick={() => setSidebarOpen(false)}
              >
                Close Menu
              </button>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 slide-up pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
