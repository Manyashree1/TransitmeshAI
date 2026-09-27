import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { Menu, X, LogOut, Wifi, WifiOff } from 'lucide-react';

const links = {
  PASSENGER: [{ to: '/passenger', label: 'My journey' }],
  DRIVER: [{ to: '/driver', label: 'Driver mode' }],
  ADMIN: [{ to: '/admin', label: 'Operations' }],
};

const roleLabel = {
  PASSENGER: 'Passenger',
  DRIVER: 'Driver',
  ADMIN: 'Operations',
};

export default function Layout() {
  const { user, logout } = useAuth();
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

  return (
    <div className="min-h-screen bg-[#0D0F0E]">
      <header className="sticky top-0 z-40 border-b border-[#292E2B] bg-[#0D0F0E]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost md:hidden px-2 py-1.5"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Logo to={`/${user.role.toLowerCase()}`} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] uppercase ${
                online
                  ? 'bg-[#9AAE8C]/10 text-[#9AAE8C] border border-[#9AAE8C]/30'
                  : 'bg-[#FF5C5C]/10 text-[#FFB0B0] border border-[#FF5C5C]/30'
              }`}
              title={online ? 'Connected to transit network' : 'Offline — updates paused'}
            >
              {online ? (
                <>
                  <span className="live-dot" />
                  <span className="hidden sm:inline">LIVE</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">OFFLINE</span>
                </>
              )}
            </div>

            <span className="hidden text-sm text-[#A4ABA6] sm:inline">
              <span className="font-semibold text-[#F3F5F2]">{user.name}</span>
              <span className="mx-1.5 text-[#6F7772]">·</span>
              <span className="text-[#A4ABA6]">{roleLabel[user.role] || user.role}</span>
            </span>

            <button
              aria-label="Sign out"
              className="btn-ghost text-xs sm:text-sm px-3 py-1.5"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside
          className={`${
            sidebarOpen
              ? 'fixed inset-0 z-50 bg-[#0D0F0E]/88 p-4 backdrop-blur-xl md:relative md:inset-auto md:z-auto md:p-0'
              : 'hidden'
          } md:block md:w-52 shrink-0`}
        >
          <nav className="space-y-1 rounded-2xl border border-[#292E2B] bg-[#151817] p-2 md:sticky md:top-24 shadow-[0_16px_32px_rgba(0,0,0,0.16)]">
            {links[user.role]?.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#1C201E] text-[#F3F5F2] border border-[#292E2B]'
                      : 'text-[#A4ABA6] hover:bg-[#1C201E] hover:text-[#F3F5F2]'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          {sidebarOpen && (
            <button
              className="btn-ghost mt-4 w-full md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              Close
            </button>
          )}
        </aside>

        <main className="min-w-0 flex-1 slide-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

