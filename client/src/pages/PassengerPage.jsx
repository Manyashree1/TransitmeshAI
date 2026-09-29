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
import { Route, Navigation, Info, Map, Activity, Clock, Sparkles, Check, ChevronRight, X, Radio } from 'lucide-react';

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
      socketFactory: () => io(import.meta.env.VITE_SOCKET_URL || undefined, {
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
          'crowd:updated': 'Crowd level updated for route.',
          'bus:location': 'Live vehicle location updated.',
          'ticketing:occupancyUpdated': 'Conductor ticket issued: passenger load updated.',
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
      setToast('Thank you! Your report updated the live crowd estimate.');
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

  if (loading) return <Loading label="Loading transit intelligence…" />;
  if (error) return <ErrorBox message={error} onRetry={() => load(routeId)} />;

  const activeBuses = buses.filter(b => b.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <p className="subheading">Commuter Radar</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
            Live Transit & Arrivals
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="live-indicator">
            <span className="live-dot" /> Live Telemetry
          </span>
        </div>
      </div>

      {/* Quick Corridor Filter Pills */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Select Transit Line
          </label>
          <span className="text-xs text-blue-600 font-bold">{routes.length} Lines Available</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {routes.map(r => {
            const isActive = r._id === routeId;
            return (
              <button
                key={r._id}
                onClick={() => {
                  setRouteId(r._id);
                  setDestination('');
                  setUserReports({});
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 scale-[1.02]'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>Line {r.routeNumber}</span>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </button>
            );
          })}
        </div>

        {/* Destination & Action Filter */}
        <div className="grid gap-3 sm:grid-cols-12 mt-4 pt-3 border-t border-slate-100 items-end">
          <div className="sm:col-span-8">
            <label className="label">Destination Station (Optional)</label>
            <select
              aria-label="Select destination"
              className="input text-xs font-semibold"
              value={destination}
              onChange={e => setDestination(e.target.value)}
            >
              <option value="">Next upcoming stop (All stops)</option>
              {route?.stops.map(s => (
                <option key={s._id} value={s._id}>
                  Stop #{s.sequence}: {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <button
              disabled={comparing || !routeId}
              className="btn-primary w-full text-xs font-bold py-2.5 cursor-pointer"
              onClick={handleCompare}
            >
              {comparing ? 'Calculating…' : 'Find Fastest Bus'}
            </button>
          </div>
        </div>
      </section>

      {/* AI Recommended Pick */}
      {rec && (
        <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-white to-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/25">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                    Best Pick
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    Bus {rec.bus.busNumber}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Arrives in <strong className="text-slate-900 font-bold">{rec.etaMinutes} mins</strong> · {rec.crowd.availableSeats ?? 22} seats left
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={crowdClass(rec.crowd.crowdLevel)}>{rec.crowd.crowdLevel}</span>
              <span className="text-xs font-extrabold text-blue-700 bg-white border border-blue-200 px-3 py-1 rounded-xl shadow-2xs">
                Score: 94/100
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Main Grid: Active Buses & Live Route Map */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Active Bus Cards List */}
        <section className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span>Live Fleet on Corridor</span>
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              {activeBuses.length} vehicles running
            </span>
          </div>

          {!activeBuses.length ? (
            <EmptyState
              title="No active buses on this line"
              description="Vehicles are scheduled to depart shortly. Switch lines to see active buses."
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

        {/* Live Map & Stations Timeline */}
        <section className="xl:col-span-5 space-y-6">
          <LiveTransitMap route={route} buses={activeBuses} />
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight mb-3 flex items-center gap-2">
              <Map className="h-4 w-4 text-blue-600" />
              <span>Station Progression</span>
            </h3>
            <StopTimeline
              stops={route?.stops || []}
              currentStopId={activeBuses[0]?.currentStop?._id || route?.stops?.[0]?._id}
              buses={activeBuses}
            />
          </div>
        </section>
      </div>

      {/* Crowd Report Modal */}
      {report && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={submit}
            className="bg-white border border-slate-200/90 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900">Report Bus Crowding</h3>
                <button
                  type="button"
                  onClick={() => setReport(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="label">Observed Crowding Level</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {['LOW', 'MEDIUM', 'HIGH', 'FULL'].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setReport({ ...report, crowdLevel: level })}
                        className={`py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                          report.crowdLevel === level
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Estimated Available Seats</label>
                  <input
                    required
                    min="0"
                    max="60"
                    type="number"
                    className="input font-bold"
                    value={report.availableSeats}
                    onChange={e =>
                      setReport({
                        ...report,
                        availableSeats: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  className="btn-secondary text-xs cursor-pointer"
                  onClick={() => setReport(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary text-xs cursor-pointer font-bold"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting…' : 'Publish Report'}
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
