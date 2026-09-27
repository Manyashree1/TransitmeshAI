import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';
import { createSocketController } from '../services/socketManager';
import {
  Loading,
  ErrorBox,
  crowdClass,
  SectionHeader,
  StatusBadge,
  EmptyState,
  MetricCard,
  AlertBar,
} from '../components/UI';
import {
  Activity,
  AlertTriangle,
  Users,
  Clock,
  Wifi,
  RefreshCw,
  MapPin,
  Route,
  Bus,
} from 'lucide-react';

export default function AdminPage() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(navigator.onLine ? 'online' : 'offline');

  const load = async () => {
    try {
      const { data } = await api.get('/admin/overview');
      setD(data);
      setLastUpdated(new Date());
    } catch (e) {
      setErr(e.response?.data?.message || 'Unable to load admin overview');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const controller = createSocketController({
      socketFactory: () => io(import.meta.env.VITE_SOCKET_URL || undefined, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      }),
      onRefresh: () => load(),
      onStatus: status => setConnectionStatus(status),
    });
    return () => controller.destroy();
  }, []);

  useEffect(() => {
    const onOnline = () => setConnectionStatus('online');
    const onOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!d) return <Loading label="Loading network overview…" />;

  const hasDelays = d.metrics.delayedBuses > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="subheading text-[#9AAE8C]">Network operations</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Operations console</h1>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <RefreshCw className="h-3.5 w-3.5" />
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <span className={`live-indicator ${connectionStatus === 'offline' ? 'bg-slate-800 text-slate-300' : ''}`}>
            <span className={`live-dot mr-1.5 ${connectionStatus === 'offline' ? 'bg-slate-500' : ''}`} />
            {connectionStatus === 'offline' ? 'Offline' : 'Live'}
          </span>
        </div>
      </div>

      {/* Alert bar for delays */}
      {hasDelays && (
        <AlertBar
          type="warning"
          title={`${d.metrics.delayedBuses} active delay${d.metrics.delayedBuses > 1 ? 's' : ''} detected`}
          message="Review delayed services below and consider dispatch adjustments."
        />
      )}

      {/* Network status strip */}
      <section className="hero-surface overflow-hidden rounded-2xl shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#9AAE8C] blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#72866D] blur-3xl" />
        </div>
        <div className="relative p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur border border-white/10">
                <Activity className="h-6 w-6 text-[#9AAE8C]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Network status</p>
                <p className="text-xs text-slate-300">
                  {hasDelays
                    ? `${d.metrics.delayedBuses} active delay${d.metrics.delayedBuses > 1 ? 's' : ''} detected`
                    : 'All services running on schedule'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-left md:text-right">
              <div>
                <p className="ops-metric">{d.metrics.activeBuses}</p>
                <p className="text-xs text-slate-400">Active buses</p>
              </div>
              <div>
                <p className="ops-metric">{d.metrics.activeTrips}</p>
                <p className="text-xs text-slate-400">Active trips</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPI metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Bus}
          label="Active Buses"
          value={d.metrics.activeBuses}
          subtext="Currently in service"
          accent="teal"
        />
        <MetricCard
          icon={Activity}
          label="Active Trips"
          value={d.metrics.activeTrips}
          subtext="Trips in progress"
          accent="emerald"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Delayed"
          value={d.metrics.delayedBuses}
          subtext="Services delayed"
          accent={hasDelays ? 'amber' : 'slate'}
        />
        <MetricCard
          icon={Users}
          label="Recent Reports"
          value={d.metrics.recentReports}
          subtext="Passenger observations"
          accent="slate"
        />
      </div>

      {/* Live network */}
      <section className="panel">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="heading flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#9AAE8C]" />
            Delayed services
          </h2>
          <span className="badge bg-slate-800 text-slate-300 border border-slate-700">
            <span className="live-dot mr-1.5" />
            Live
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 pb-3 font-semibold">Bus</th>
                <th className="px-5 pb-3 font-semibold">Route</th>
                <th className="px-5 pb-3 font-semibold">Current stop</th>
                <th className="px-5 pb-3 font-semibold">Crowd</th>
                <th className="px-5 pb-3 font-semibold">Delay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {d.delayed.map(t => (
                <tr key={t._id} className="group hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-white">
                      {t.busId?.busNumber}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    Route {t.routeId?.routeNumber}
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {t.currentStop?.name || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge variant="danger">HIGH</StatusBadge>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-semibold text-amber-400">
                      +{t.delayMinutes} min
                    </span>
                  </td>
                </tr>
              ))}
              {d.delayed.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                    No active delays. Network is running on schedule.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Route health */}
        <section className="panel">
          <h2 className="heading mb-4">Route health</h2>
          <div className="space-y-3">
            {d.routeStats.map(r => (
              <div
                key={r.routeNumber}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/30 p-4 hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-white">
                    Route {r.routeNumber}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.name} · {r.stops} stops
                  </p>
                </div>
                <span className="badge bg-slate-800 text-slate-300 border border-slate-700">
                  {r.activeBuses} active
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Recent crowd reports */}
        <section className="panel">
          <h2 className="heading mb-4">Recent passenger reports</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-2 font-semibold">Bus</th>
                  <th className="pb-2 font-semibold">Route</th>
                  <th className="pb-2 font-semibold">Crowd</th>
                  <th className="pb-2 font-semibold">Seats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {d.reports.map(r => (
                  <tr key={r._id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 font-semibold text-white">
                      {r.busId?.busNumber}
                    </td>
                    <td className="py-2.5 text-slate-400">
                      {r.routeId?.routeNumber}
                    </td>
                    <td className="py-2.5">
                      <span className={crowdClass(r.crowdLevel)}>
                        {r.crowdLevel}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">
                      {r.availableSeats}
                    </td>
                  </tr>
                ))}
                {d.reports.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-sm text-slate-500"
                    >
                      No recent passenger reports.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}