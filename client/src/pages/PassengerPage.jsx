import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';
import { createSocketController } from '../services/socketManager';
import {
  Loading,
  ErrorBox,
  EmptyState,
  Toast,
  crowdClass,
  SectionHeader,
  ProgressBar,
  MetricCard,
  StopTimeline,
} from '../components/UI';
import BusCard from '../components/BusCard';
import LiveTransitMap from '../components/LiveTransitMap';
import { Route, Navigation, Info, Map, Activity, Clock } from 'lucide-react';

export default function PassengerPage() {
  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState('');
  const [destination, setDestination] = useState('');
  const [buses, setBuses] = useState([]);
  const [rec, setRec] = useState(null);
  const [choices, setChoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [report, setReport] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userReports, setUserReports] = useState({});
  const [connectionStatus, setConnectionStatus] = useState(navigator.onLine ? 'online' : 'offline');
  const [lastUpdated, setLastUpdated] = useState(null);

  const route = useMemo(
    () => routes.find(r => r._id === routeId),
    [routes, routeId]
  );

  const load = async (id, dest = destination) => {
    if (!id) return;
    try {
      const [b, r] = await Promise.all([
        api.get('/buses', { params: { routeId: id } }),
        api.get('/recommendations', {
          params: { routeId: id, destinationStop: dest || undefined },
        }),
      ]);
      setBuses(b.data.buses);
      setRec(r.data.recommendation);
      setChoices(r.data.buses);
      setLastUpdated(new Date());
    } catch (e) {
      setError(
        e.response?.data?.message || 'Unable to connect to transit network.'
      );
    }
  };

  useEffect(() => {
    api.get('/routes')
      .then(({ data }) => {
        setRoutes(data.routes);
        setRouteId(data.routes[0]?._id || '');
      })
      .catch(() => setError('Unable to connect to transit network.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (routeId) load(routeId);
  }, [routeId]);

  useEffect(() => {
    const socketController = createSocketController({
      socketFactory: () => io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      }),
      onRefresh: () => {
        if (routeId) load(routeId);
      },
      onStatus: status => setConnectionStatus(status),
      onEvent: (eventName, data) => {
        const messages = {
          'bus:stopReached': `Bus ${data?.busId?.busNumber || ''} reached ${data?.currentStop?.name || 'stop'}.`,
          'bus:delayUpdated': `Bus ${data?.busId?.busNumber || ''} delay updated to ${data?.delayMinutes || 0} min.`,
          'crowd:updated': 'Network crowd estimate updated.',
          'bus:location': 'Live vehicle position updated.',
          'ticketing:occupancyUpdated': 'Estimated occupancy updated from ticketing activity.',
        };
        const message = messages[eventName];
        if (message) {
          setToast(message);
          setTimeout(() => setToast(''), 3000);
        }
      },
    });

    return () => socketController.destroy();
  }, [routeId]);

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

  const submit = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const bus = buses.find(x => x._id === report.busId);
      await api.post('/crowd-reports', {
        ...report,
        routeId,
        stopId: bus.currentStop?._id,
      });
      setToast('Your report improved the live crowd estimate.');
      setReport(null);
      setUserReports(p => ({
        ...p,
        [report.busId]: {
          crowdLevel: report.crowdLevel,
          availableSeats: Number(report.availableSeats),
          timestamp: new Date().toISOString(),
        },
      }));
      load(routeId);
    } catch (e) {
      setToast(
        e.response?.data?.message || 'Report could not be sent'
      );
    }
    setSubmitting(false);
  };

  const handleCompare = () => {
    setComparing(true);
    load(routeId, destination).finally(() => setComparing(false));
  };

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={() => load(routeId)} />;

  const activeBuses = buses.filter(b => b.status === 'ACTIVE');
  const staleSignal = !!lastUpdated && Date.now() - lastUpdated.getTime() > 120000;

  return (
    <div className="space-y-6">
      <SectionHeader
        label="Passenger intelligence"
        title="Find the best current ride"
      />

      {route && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <section className="panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="subheading text-[#9AAE8C]">Current route</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                  Route {route.routeNumber}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{route.name}</p>
              </div>
              <span className={`live-indicator ${connectionStatus === 'offline' ? 'bg-slate-800 text-slate-300' : ''}`}>
                <span className={`live-dot mr-1.5 ${connectionStatus === 'offline' ? 'bg-slate-500' : ''}`} />
                {connectionStatus === 'offline' ? 'Offline' : staleSignal ? 'Stale' : 'Live'}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <MetricCard icon={Activity} label="Active buses" value={activeBuses.length} subtext="in service" accent="teal" />
              <MetricCard icon={Clock} label="Best ETA" value={rec?.etaMinutes ? `${rec.etaMinutes} min` : '—'} subtext="recommended service" accent="emerald" />
              <MetricCard icon={Map} label="Stops" value={route.stops?.length || 0} subtext="served on route" accent="slate" />
            </div>
          </section>

          <section className="panel p-5">
            <p className="subheading text-[#9AAE8C]">Signal status</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                <span className="text-sm text-slate-400">GPS</span>
                <span className="badge bg-[#9AAE8C]/10 text-[#9AAE8C] border border-[#9AAE8C]/35">SIMULATED</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                <span className="text-sm text-slate-400">Occupancy</span>
                <span className="badge bg-[#9AAE8C]/10 text-[#9AAE8C] border border-[#9AAE8C]/35">ESTIMATED</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                <span className="text-sm text-slate-400">Prediction</span>
                <span className="badge bg-amber-500/10 text-amber-300 border border-amber-500/30">PROTOTYPE</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                <span className="text-sm text-slate-400">Signal age</span>
                <span className={`badge ${staleSignal ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-[#9AAE8C]/10 text-[#9AAE8C] border border-[#9AAE8C]/35'}`}>
                  {lastUpdated ? `${Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000))}s` : '—'}
                </span>
              </div>
            </div>
          </section>
        </div>
      )}

      <section className="glass-panel p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="label">
            <span className="flex items-center gap-1.5">
              <Route className="h-4 w-4 text-[#9AAE8C]" />
              Route
            </span>
            <select
              aria-label="Select route"
              className="input mt-1.5"
              value={routeId}
              onChange={e => {
                setRouteId(e.target.value);
                setDestination('');
                setUserReports({});
              }}
            >
              {routes.map(r => (
                <option key={r._id} value={r._id}>
                  Route {r.routeNumber} · {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            <span className="flex items-center gap-1.5">
              <Navigation className="h-4 w-4 text-[#9AAE8C]" />
              Destination
            </span>
            <select
              aria-label="Select destination"
              className="input mt-1.5"
              value={destination}
              onChange={e => setDestination(e.target.value)}
            >
              <option value="">Next available stop</option>
              {route?.stops.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              disabled={comparing || !routeId}
              className="btn-primary w-full"
              onClick={handleCompare}
            >
              {comparing ? 'Comparing…' : 'Compare rides'}
            </button>
          </div>
        </div>
      </section>

      {rec && (
        <section className="slide-up overflow-hidden rounded-3xl border border-[#22313c] bg-[#101a22] text-white shadow-[0_28px_60px_rgba(2,6,23,0.28)]">
          <div className="border-b border-[#1d2a33] px-6 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9AAE8C]">
              Best option
            </p>
          </div>
          <div className="p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Route {route?.routeNumber}</p>
                <p className="mt-3 text-4xl font-black tracking-[-0.05em] text-white">Bus {rec.bus.busNumber}</p>
                <p className="mt-2 text-base text-slate-300">
                  {rec.etaMinutes} min away · {rec.bus.currentStop?.name || 'en route'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={crowdClass(rec.crowd.crowdLevel)}>{rec.crowd.crowdLevel} crowd</span>
                <span className="badge bg-[#111821] text-slate-200 border border-[#2a3945]">{rec.crowd.availableSeats ?? '—'} seats</span>
                {rec.delayMinutes > 0 && <span className="badge bg-amber-500/10 text-amber-300 border border-amber-500/30">+{rec.delayMinutes} min delay</span>}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#22313c] bg-[#0d141a] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">ETA</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">{rec.etaMinutes} min</p>
              </div>
              <div className="rounded-2xl border border-[#22313c] bg-[#0d141a] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Occupancy</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">{rec.crowd.availableSeats ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-[#22313c] bg-[#0d141a] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Why this ride</p>
                <p className="mt-2 text-sm font-semibold text-slate-200">{rec.delayMinutes > 0 ? 'Lower delay and better crowding.' : 'Faster ETA with better crowding.'}</p>
              </div>
            </div>

            <p className="mt-5 flex items-start gap-2 text-sm text-slate-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#9AAE8C]" />
              {rec.reason}
            </p>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        {/* Buses */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="heading flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#9AAE8C]" />
              Active buses
            </h2>
            <span className="badge bg-slate-800 text-slate-300 border border-slate-700">
              {activeBuses.length} active
            </span>
          </div>
          {!activeBuses.length ? (
            <EmptyState
              title="No active buses"
              description="There are currently no active buses on this route."
            />
          ) : (
            <div className="grid gap-4">
              {activeBuses.map(b => (
                <BusCard
                  key={b._id}
                  bus={b}
                  eta={choices.find(x => x.bus._id === b._id)?.etaMinutes}
                  userReport={userReports[b._id]}
                  onReport={b =>
                    setReport({
                      busId: b._id,
                      crowdLevel: 'MEDIUM',
                      availableSeats: b.crowd.availableSeats ?? 10,
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Route view */}
        <section className="space-y-4">
          <h2 className="heading flex items-center gap-2">
            <Map className="h-5 w-5 text-[#9AAE8C]" />
            Live route view
          </h2>
          <LiveTransitMap route={route} buses={activeBuses} />
          <StopTimeline stops={route?.stops || []} currentStopId={route?.stops?.[0]?._id} buses={activeBuses} />
        </section>
      </div>

      {/* Crowd report modal */}
      {report && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={submit}
            className="panel w-full max-w-md"
          >
            <div className="p-6">
              <h2 className="heading">Report crowd</h2>
              <p className="mt-1 text-sm text-slate-400">
                Your observation improves the live estimate.
              </p>
              <label className="label mt-4">
                Crowd level
                <select
                  className="input mt-1.5"
                  value={report.crowdLevel}
                  onChange={e =>
                    setReport({ ...report, crowdLevel: e.target.value })
                  }
                >
                  {['LOW', 'MEDIUM', 'HIGH', 'FULL'].map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="label mt-4">
                Available seats
                <input
                  required
                  min="0"
                  type="number"
                  className="input mt-1.5"
                  value={report.availableSeats}
                  onChange={e =>
                    setReport({
                      ...report,
                      availableSeats: e.target.value,
                    })
                  }
                />
              </label>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setReport(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting…' : 'Submit report'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}