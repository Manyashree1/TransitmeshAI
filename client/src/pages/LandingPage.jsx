import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { Activity, Users, Zap } from 'lucide-react';

const capabilities = [
  {
    icon: Activity,
    title: 'LIVE',
    desc: 'Driver-confirmed stop events reach passengers instantly via Socket.IO.',
  },
  {
    icon: Users,
    title: 'INTELLIGENCE',
    desc: 'Recency-weighted crowd estimates with confidence scoring.',
  },
  {
    icon: Zap,
    title: 'DECISIONS',
    desc: 'Explainable multi-factor recommendation engine for better boarding choices.',
  },
];

const networkPreview = [
  { bus: 'TM-1202', route: '12', stop: 'Central Station', crowd: 'LOW', delay: null },
  { bus: 'TM-1201', route: '12', stop: 'Museum Square', crowd: 'HIGH', delay: '+2 min' },
  { bus: 'TM-2401', route: '24', stop: 'University Gate', crowd: 'MEDIUM', delay: '+6 min' },
];

const roles = [
  {
    role: 'Passenger',
    desc: 'Compare buses, track live ETAs, submit crowd observations.',
    to: '/login',
    cta: 'Sign in as passenger',
    accent: 'border-l-[#9AAE8C]',
  },
  {
    role: 'Driver',
    desc: 'Manage trips, report stops, and keep passengers informed.',
    to: '/login',
    cta: 'Sign in as driver',
    accent: 'border-l-amber-500',
  },
  {
    role: 'Operations',
    desc: 'Monitor network health, delays, and fleet status.',
    to: '/login',
    cta: 'Sign in as admin',
    accent: 'border-l-slate-900',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0D0F0E] text-[#F3F5F2]">
      {/* Header */}
      <header className="border-b border-[#292E2B] bg-[#0D0F0E]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Logo />
          <div className="flex gap-2 sm:gap-3">
            <Link className="btn-secondary" to="/login">
              Sign in
            </Link>
            <Link className="btn-primary" to="/register">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0D0F0E]">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#9AAE8C] blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[#72866D] blur-3xl opacity-40" />
            <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#9AAE8C] blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
            <div className="max-w-2xl">
              <p className="subheading text-[#9AAE8C]">Live transit intelligence</p>
              <h1 className="display mt-5 text-[#F3F5F2]">
                Know where your bus is. Know how crowded it is.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#A4ABA6]">
                TransitAI Mesh combines live driver events and passenger
                observations into practical, explainable ride guidance.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="btn-primary" to="/login">
                  Explore network
                </Link>
                <Link className="btn-secondary" to="/register">
                  Create account
                </Link>
              </div>
            </div>

            {/* Live Network Preview */}
            <div className="panel-raised">
              <div className="flex items-center justify-between border-b border-[#292E2B] px-5 py-4">
                <p className="subheading text-[#A4ABA6]">Live Network Snapshot</p>
                <span className="badge bg-[#9AAE8C]/10 text-[#9AAE8C] border border-[#9AAE8C]/35">
                  <span className="live-dot mr-1.5" />
                  Live
                </span>
              </div>
              <div className="p-5">
                <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">
                        Route 12 · Riverside
                      </p>
                      <p className="text-xs text-slate-400">2 active services</p>
                    </div>
                    <span className="badge bg-slate-800 text-slate-300 border border-slate-700">
                      2 buses
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {networkPreview.map(({ bus, route, stop, crowd, delay }) => (
                    <div
                      key={bus}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/20 p-4 hover:bg-slate-800/40 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{bus}</p>
                        <p className="text-xs text-slate-400">
                          Route {route} · {stop}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {delay && (
                          <span className="text-xs font-semibold text-amber-400">
                            {delay}
                          </span>
                        )}
                        <span className={`badge crowd-${crowd}`}>{crowd}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="border-y border-[#292E2B] bg-[#151817]">
          <div className="mx-auto max-w-7xl px-5 py-14">
            <div className="mx-auto max-w-2xl text-center">
              <p className="subheading text-[#9AAE8C]">Built for real transit</p>
              <h2 className="heading mt-4 text-[#F3F5F2]">
                Deterministic intelligence, not black-box AI.
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#A4ABA6]">
                Every recommendation is explainable. Every estimate is
                reproducible. No machine learning claims—just reliable,
                rule-based transit intelligence designed for Indian urban
                networks.
              </p>
            </div>
            <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
              {capabilities.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="panel-raised p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-black text-slate-900 tracking-wide">
                    {title}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Role entry */}
        <section className="mx-auto max-w-7xl px-5 py-14">
          <div className="grid gap-6 lg:grid-cols-3">
            {roles.map(({ role, desc, to, cta, accent }) => (
              <div
                key={role}
                className={`panel-raised flex flex-col border-l-4 ${accent}`}
              >
                <p className="subheading text-slate-900">{role}</p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
                <Link
                  to={to}
                  className="btn-secondary mt-auto w-full justify-center text-xs"
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <p className="text-xs text-slate-500">
            TransitAI Mesh · Live transit intelligence
          </p>
          <p className="text-xs text-slate-400">
            Deterministic V1.5 · No black-box AI
          </p>
        </div>
      </footer>
    </div>
  );
}

