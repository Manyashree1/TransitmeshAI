import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { getQueuedEtmEvents, queueEtmEvent, syncQueuedEtmEvents } from '../services/offlineQueue';
import {
  Loading,
  ErrorBox,
  Toast,
  SectionHeader,
  StatusBadge,
  EmptyState,
  ProgressBar,
} from '../components/UI';
import {
  Bus,
  MapPin,
  Clock,
  Navigation,
  Play,
  Square,
  AlertTriangle,
  Wifi,
  Route,
  Ticket,
  Printer,
} from 'lucide-react';

export default function DriverPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [delay, setDelay] = useState('5');
  const [reason, setReason] = useState('Traffic');
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ticketForm, setTicketForm] = useState({ destinationStopId: '', ticketType: 'ADULT', passengerCount: 1 });
  const [recentTickets, setRecentTickets] = useState([]);
  const [syncState, setSyncState] = useState(navigator.onLine ? 'online' : 'offline');
  const [queuedCount, setQueuedCount] = useState(0);

  const load = () =>
    api
      .get('/trips/my-assignment')
      .then(r => setData(r.data))
      .catch(e =>
        setErr(e.response?.data?.message || 'Could not load assignment')
      );

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const refreshQueue = async () => {
      const queued = await getQueuedEtmEvents();
      setQueuedCount(queued.length);
      setSyncState(queued.length ? 'pending_sync' : navigator.onLine ? 'online' : 'offline');
    };
    refreshQueue();

    const handleOnline = async () => {
      setSyncState('retrying');
      try {
        await syncQueuedEtmEvents(api);
        setToast('Queued ETM events synced.');
      } catch {
        setToast('Queued ETM events could not be fully synced.');
      }
      refreshQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const action = async (path, body = {}, msg = 'Trip updated') => {
    setBusy(true);
    try {
      await api.post(path, body);
      setToast(msg);
      load();
    } catch (e) {
      setToast(e.response?.data?.message || 'Action failed');
    }
    setBusy(false);
    setTimeout(() => setToast(''), 3000);
  };

  const next = useMemo(() => {
    const stops = data?.bus?.routeId?.stops || [];
    const i = stops.findIndex(
      s => s._id === (data?.trip?.currentStop?._id || data?.bus?.currentStop?._id)
    );
    return stops[i + 1]?.name || 'Final stop';
  }, [data]);

  const issueTicket = async e => {
    e.preventDefault();
    if (!trip || !ticketForm.destinationStopId) return;
    setBusy(true);
    const payload = {
      tripId: trip._id,
      sourceStopId: trip.currentStop._id,
      ...ticketForm,
      passengerCount: Number(ticketForm.passengerCount),
      transactionId: `ETM-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    };

    try {
      const { data: result } = await api.post('/ticketing/events', payload);
      setRecentTickets(items => [result.ticket, ...items].slice(0, 5));
      setSyncState('synced');
      setToast(`${result.ticket.passengerCount} ticket passenger${result.ticket.passengerCount > 1 ? 's' : ''} issued. Estimated onboard: ${result.occupancy.estimatedOnboard}/${bus.capacity}.`);
      setTicketForm(form => ({ ...form, passengerCount: 1 }));
    } catch (e) {
      if (!navigator.onLine || e.code === 'ERR_NETWORK') {
        const queued = await queueEtmEvent({ ...payload, syncStatus: 'PENDING_SYNC' });
        setRecentTickets(items => [{ ...queued, _local: true }, ...items].slice(0, 5));
        setQueuedCount((await getQueuedEtmEvents()).length);
        setSyncState('pending_sync');
        setToast(`Offline: ETM event queued locally with transaction ${queued.id}.`);
      } else {
        setToast(e.response?.data?.message || 'Ticket could not be issued');
      }
    }
    setBusy(false); setTimeout(() => setToast(''), 4000);
  };

  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!data) return <Loading label="Loading your assignment…" />;
  const { bus, trip } = data;
  if (!bus) {
    return (
      <EmptyState
        title="No assignment"
        description="No bus is assigned to this driver account."
      />
    );
  }

  const hasTrip = !!trip;
  const isActive = hasTrip && trip.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <SectionHeader
        label="Driver control"
        title="Trip control panel"
      />

      {/* Bus info */}
      <section className="panel">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <p className="metric-label">Assigned bus</p>
              <p className="text-lg font-bold text-white">{bus.busNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <p className="metric-label">Route</p>
              <p className="text-lg font-bold text-white">Route {bus.routeId?.routeNumber}</p>
              <p className="text-xs text-slate-400">{bus.routeId?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="metric-label">Current stop</p>
              <p className="text-lg font-bold text-white">{trip?.currentStop?.name || bus.currentStop?.name || 'Start terminal'}</p>
              <p className="text-xs text-slate-400">Telemetry inferred</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <p className="metric-label">Next stop</p>
              <p className="text-lg font-bold text-white">{next}</p>
              <p className="text-xs text-slate-400">{isActive ? 'In progress' : 'No active trip'}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 border-t border-slate-800 pt-6">
          {!hasTrip ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-6 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Ready to start a new trip
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Starting a trip notifies passengers and operations.
                </p>
              </div>
              <button
                disabled={busy}
                className="btn-primary w-full sm:w-auto"
                onClick={() => action('/trips/start', { busId: bus._id })}
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Starting…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Start trip
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`live-indicator ${syncState === 'offline' || syncState === 'pending_sync' ? 'bg-slate-800 text-slate-300' : ''}`}>
                    <span className={`live-dot mr-1.5 ${syncState === 'offline' || syncState === 'pending_sync' ? 'bg-slate-500' : ''}`} />
                    {syncState === 'pending_sync' ? 'Pending sync' : syncState === 'offline' ? 'Offline' : syncState === 'retrying' ? 'Retrying' : 'Active trip'}
                  </span>
                  {trip.delayMinutes > 0 && (
                    <StatusBadge variant="warning">
                      +{trip.delayMinutes} min delay
                    </StatusBadge>
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Wifi className={`h-3.5 w-3.5 ${syncState === 'offline' ? 'text-amber-400' : 'text-[#9AAE8C]'}`} />
                  {queuedCount ? `${queuedCount} queued ETM event${queuedCount > 1 ? 's' : ''}` : 'Passenger network synchronized'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Passenger and operations dashboards are receiving live updates.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  disabled={busy}
                  className="btn-secondary w-full"
                  onClick={() => setModal(true)}
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Report delay
                  </span>
                </button>
                <button
                  disabled={busy}
                  className="btn-danger w-full"
                  onClick={() =>
                    action(`/trips/${trip._id}/end`, {}, 'Trip ended')
                  }
                >
                  <span className="flex items-center gap-2">
                    <Square className="h-4 w-4" />
                    End trip
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {isActive && (
        <section className="terminal">
          <div className="terminal-header">
            <div className="flex gap-1.5">
              <div className="terminal-dot bg-rose-500" />
              <div className="terminal-dot bg-amber-500" />
              <div className="terminal-dot bg-[#9AAE8C]" />
            </div>
            <span className="text-xs font-bold text-slate-400 ml-2">CONDUCTOR ETM CONSOLE</span>
            <span className="badge bg-[#9AAE8C]/10 text-[#9AAE8C] border border-[#9AAE8C]/35 ml-auto">SYNCED / SIMULATED</span>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Current Bus</p>
                <p className="text-lg font-black text-white font-mono">{bus.busNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Route</p>
                <p className="text-lg font-black text-white font-mono">Route {bus.routeId?.routeNumber}</p>
              </div>
            </div>

            <form onSubmit={issueTicket} className="mt-5 grid gap-4 md:grid-cols-4">
              <label className="label">
                Source
                <input className="input mt-1.5 bg-slate-900/50 font-mono text-[#9AAE8C]" disabled value={trip.currentStop?.name || ''} />
              </label>
              <label className="label">
                Destination
                <select required className="input mt-1.5" value={ticketForm.destinationStopId} onChange={e=>setTicketForm({...ticketForm,destinationStopId:e.target.value})}>
                  <option value="">Select stop</option>
                  {(data.bus.routeId?.stops || []).filter(s=>s.sequence > (trip.currentStop?.sequence || 0)).map(s=><option value={s._id} key={s._id}>{s.name}</option>)}
                </select>
              </label>
              <label className="label">
                Ticket type
                <select className="input mt-1.5" value={ticketForm.ticketType} onChange={e=>setTicketForm({...ticketForm,ticketType:e.target.value})}>
                  {['ADULT','STUDENT','SENIOR'].map(type=><option key={type}>{type}</option>)}
                </select>
              </label>
              <label className="label">
                Passengers
                <input required min="1" max="10" type="number" className="input mt-1.5" value={ticketForm.passengerCount} onChange={e=>setTicketForm({...ticketForm,passengerCount:e.target.value})} />
              </label>
              <div className="md:col-span-4 flex justify-end">
                <button disabled={busy || !ticketForm.destinationStopId} className="btn-teal">
                  {busy?'Issuing…':<span className="flex items-center gap-2"><Ticket className="h-4 w-4" /> Issue ticket</span>}
                </button>
              </div>
            </form>

            {recentTickets.length>0 && (
              <div className="mt-5 border-t border-slate-800 pt-4">
                <p className="metric-label mb-3">Recently issued tickets</p>
                <div className="space-y-2">
                  {recentTickets.map(ticket=>(
                    <div key={ticket._id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Printer className="h-4 w-4 text-slate-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-200 font-mono">
                            {ticket.sourceStopId?.name} → {ticket.destinationStopId?.name}
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                            {ticket.ticketType} · {new Date(ticket.issuedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#9AAE8C]">+{ticket.passengerCount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Delay modal */}
      {modal && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={e => {
              e.preventDefault();
              action(
                `/trips/${trip._id}/delay`,
                { delayMinutes: Number(delay), reason },
                'Delay reported'
              );
              setModal(false);
            }}
            className="panel w-full max-w-md"
          >
            <div className="p-6">
              <h2 className="heading">Report delay</h2>
              <p className="mt-1 text-sm text-slate-400">
                Passengers and operations will see the updated time.
              </p>
              <label className="label mt-4">
                Delay (minutes)
                <input
                  required
                  min="0"
                  max="180"
                  type="number"
                  className="input mt-1.5"
                  value={delay}
                  onChange={e => setDelay(e.target.value)}
                />
              </label>
              <label className="label mt-4">
                Reason
                <input
                  required
                  maxLength={120}
                  className="input mt-1.5"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </label>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModal(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={busy}
                >
                  {busy ? 'Reporting…' : 'Report delay'}
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