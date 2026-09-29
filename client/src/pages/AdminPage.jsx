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
  CheckCircle2,
  TrendingUp,
  Cpu,
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
      setErr(e.response?.data?.message || 'Unable to load network overview');
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
  if (!d) return <Loading label="Loading fleet operations telemetry…" />;

  const hasDelays = d.metrics.delayedBuses > 0;
  const onTimePercentage = Math.round(((d.metrics.activeBuses - d.metrics.delayedBuses) / Math.max(1, d.metrics.activeBuses)) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <p className="subheading">Municipal Transit Operations</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Fleet Operations Console
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{lastUpdated.toLocaleTimeString()}</span>
            </span>
          )}
          <span className="live-indicator">
            <span className="live-dot" /> Live Fleet Telemetry
          </span>
        </div>
      </div>

      {/* Delay Warning Alert */}
      {hasDelays && (
        <AlertBar
          type="warning"
          title={`${d.metrics.delayedBuses} Active Vehicle Delay${d.metrics.delayedBuses > 1 ? 's' : ''} Detected`}
          message="Traffic bottlenecks detected along central corridors. Review delayed services below and consider dynamic headway adjustments."
        />
      )}

      {/* Top Operations Executive Banner */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-xs text-emerald-300 border border-white/10">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Mysuru Municipal Transit Authority</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Network Operating at {onTimePercentage}% On-Time Performance
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Automatic vehicle location (AVL) stream active across all 6 corridors. Passenger crowding models continuously calibrated with ETM ticket events.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:text-right shrink-0">
            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs border border-white/10">
              <p className="text-2xl font-black text-white">{d.metrics.activeBuses}</p>
              <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mt-0.5">Active Fleet</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs border border-white/10">
              <p className="text-2xl font-black text-white">{d.metrics.activeTrips}</p>
              <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mt-0.5">En Route</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs border border-white/10 col-span-2 sm:col-span-1">
              <p className="text-2xl font-black text-emerald-400">{d.routeStats.length}</p>
              <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mt-0.5">Corridors</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Bus}
          label="Active Fleet Vehicles"
          value={d.metrics.activeBuses}
          subtext="Telemetry transmitting"
          accent="blue"
        />
        <MetricCard
          icon={Activity}
          label="Trips in Progress"
          value={d.metrics.activeTrips}
          subtext="Passenger services live"
          accent="emerald"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Delayed Services"
          value={d.metrics.delayedBuses}
          subtext={hasDelays ? 'Requires dispatch attention' : 'All running on time'}
          accent={hasDelays ? 'amber' : 'slate'}
        />
        <MetricCard
          icon={Users}
          label="Recent Crowd Reports"
          value={d.metrics.recentReports}
          subtext="Calibrating live load factor"
          accent="slate"
        />
      </div>

      {/* Delayed Buses Table */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Active Corridor Delays</h2>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            {d.delayed.length} delayed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3 font-bold">Vehicle ID</th>
                <th className="px-6 py-3 font-bold">Corridor</th>
                <th className="px-6 py-3 font-bold">Current Station</th>
                <th className="px-6 py-3 font-bold">Delay Duration</th>
                <th className="px-6 py-3 font-bold">Reported Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.delayed.map(t => (
                <tr key={t._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-900">
                    {t.busId?.busNumber}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600 font-medium">
                    Route {t.routeId?.routeNumber}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">
                    {t.currentStop?.name || 'In Transit'}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      +{t.delayMinutes} min
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 text-xs">
                    {t.delayReason || 'Congested Traffic'}
                  </td>
                </tr>
              ))}
              {d.delayed.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                    All fleet vehicles are currently operating on schedule.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grid: Route Health & Recent Passenger Observations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Route Health */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Corridor Fleet Allocation</h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">{d.routeStats.length} Lines</span>
          </div>

          <div className="space-y-3">
            {d.routeStats.map(r => (
              <div
                key={r.routeNumber}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 hover:bg-slate-50 hover:border-slate-200 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">Line {r.routeNumber}</span>
                    <span className="text-xs text-slate-500">· {r.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{r.stops} stations along corridor</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white text-blue-700 border border-slate-200 shadow-sm">
                  <Bus className="h-3 w-3" />
                  <span>{r.activeBuses} active</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Crowd Observations Stream */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Recent Passenger Reports</h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">Live Feed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="pb-2.5 font-bold">Vehicle</th>
                  <th className="pb-2.5 font-bold">Crowd Level</th>
                  <th className="pb-2.5 font-bold">Reported Seats</th>
                  <th className="pb-2.5 font-bold">Reporter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.reports.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900">
                      {r.busId?.busNumber || 'TM-BUS'}
                    </td>
                    <td className="py-2.5">
                      <span className={crowdClass(r.crowdLevel)}>
                        {r.crowdLevel}
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-slate-700">
                      {r.availableSeats} seats
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {r.userId?.name || 'Rider'}
                    </td>
                  </tr>
                ))}
                {d.reports.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
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
