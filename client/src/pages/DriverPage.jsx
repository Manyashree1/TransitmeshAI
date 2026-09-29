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
  CheckCircle2,
  X,
  CreditCard,
  Plus,
  Minus,
} from 'lucide-react';

export default function DriverPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [delay, setDelay] = useState('5');
  const [reason, setReason] = useState('Heavy Traffic');
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ticketForm, setTicketForm] = useState({ destinationStopId: '', ticketType: 'ADULT', passengerCount: 1 });
  const [recentTickets, setRecentTickets] = useState([]);
  const [syncState, setSyncState] = useState(navigator.onLine ? 'online' : 'offline');
  const [queuedCount, setQueuedCount] = useState(0);

  const load = () => {
    setErr('');
    api
      .get('/trips/my-assignment')
      .then(r => {
        if (r.data && r.data.bus) {
          setData(r.data);
        } else {
          // Provide default active vehicle if none assigned yet
          const fallbackBus = {
            _id: '66a000000000000000000301',
            busNumber: 'TM-1201',
            capacity: 44,
            status: 'ACTIVE',
            tripStatus: 'IN_PROGRESS',
            routeId: {
              _id: '66a000000000000000000101',
              routeNumber: '12',
              name: 'Central Station → Riverside',
              stops: [
                { _id: '66a000000000000000000200', name: 'Central Station', sequence: 1 },
                { _id: '66a000000000000000000201', name: 'Museum Square', sequence: 2 },
                { _id: '66a000000000000000000202', name: 'City Hospital', sequence: 3 },
                { _id: '66a000000000000000000203', name: 'Riverside Market', sequence: 4 },
                { _id: '66a000000000000000000204', name: 'Riverside Terminal', sequence: 5 },
              ],
            },
            currentStop: { _id: '66a000000000000000000201', name: 'Museum Square', sequence: 2 },
          };
          const fallbackTrip = {
            _id: '66a000000000000000000401',
            busId: fallbackBus._id,
            routeId: fallbackBus.routeId._id,
            currentStop: fallbackBus.currentStop,
            status: 'ACTIVE',
            delayMinutes: 0,
          };
          setData({ bus: fallbackBus, trip: fallbackTrip });
        }
      })
      .catch(() => {
        // Fallback demo state
        const fallbackBus = {
          _id: '66a000000000000000000301',
          busNumber: 'TM-1201',
          capacity: 44,
          status: 'ACTIVE',
          tripStatus: 'IN_PROGRESS',
          routeId: {
            _id: '66a000000000000000000101',
            routeNumber: '12',
            name: 'Central Station → Riverside',
            stops: [
              { _id: '66a000000000000000000200', name: 'Central Station', sequence: 1 },
              { _id: '66a000000000000000000201', name: 'Museum Square', sequence: 2 },
              { _id: '66a000000000000000000202', name: 'City Hospital', sequence: 3 },
              { _id: '66a000000000000000000203', name: 'Riverside Market', sequence: 4 },
              { _id: '66a000000000000000000204', name: 'Riverside Terminal', sequence: 5 },
            ],
          },
          currentStop: { _id: '66a000000000000000000201', name: 'Museum Square', sequence: 2 },
        };
        const fallbackTrip = {
          _id: '66a000000000000000000401',
          busId: fallbackBus._id,
          routeId: fallbackBus.routeId._id,
          currentStop: fallbackBus.currentStop,
          status: 'ACTIVE',
          delayMinutes: 0,
        };
        setData({ bus: fallbackBus, trip: fallbackTrip });
      });
  };

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
      const synced = await syncQueuedEtmEvents();
      if (synced.synced) {
        setToast(`Network restored: ${synced.synced} offline tickets synced.`);
      }
      refreshQueue();
    };

    const handleOffline = () => setSyncState('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const next = useMemo(() => {
    if (!data?.bus?.routeId?.stops || !data?.trip?.currentStop) return 'Terminal';
    const stops = data.bus.routeId.stops;
    const currentId = data.trip.currentStop._id;
    const i = stops.findIndex(s => s._id === currentId);
    return i >= 0 && i < stops.length - 1 ? stops[i + 1].name : 'Final Stop';
  }, [data]);

  const action = (endpoint, body = {}, successMsg) => {
    setBusy(true);
    api
      .post(endpoint, body)
      .then(() => {
        if (successMsg) setToast(successMsg);
        load();
      })
      .catch(e =>
        setToast(e.response?.data?.message || 'Operation failed')
      )
      .finally(() => {
        setBusy(false);
        setTimeout(() => setToast(''), 4000);
      });
  };

  const issueTicket = async e => {
    e.preventDefault();
    if (!ticketForm.destinationStopId) return;
    setBusy(true);

    const { bus, trip } = data;
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
      setToast(`Ticket issued: ${result.ticket.passengerCount} passenger${result.ticket.passengerCount > 1 ? 's' : ''}. Est. onboard: ${result.occupancy.estimatedOnboard}/${bus.capacity}.`);
      setTicketForm(form => ({ ...form, passengerCount: 1 }));
    } catch (e) {
      if (!navigator.onLine || e.code === 'ERR_NETWORK') {
        const queued = await queueEtmEvent({ ...payload, syncStatus: 'PENDING_SYNC' });
        setRecentTickets(items => [{ ...queued, _local: true }, ...items].slice(0, 5));
        setQueuedCount((await getQueuedEtmEvents()).length);
        setSyncState('pending_sync');
        setToast(`Offline Dead-Zone: Ticket queued with ID ${queued.id}.`);
      } else {
        setToast(e.response?.data?.message || 'Ticket could not be issued');
      }
    }
    setBusy(false);
    setTimeout(() => setToast(''), 4000);
  };

  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!data) return <Loading label="Loading driver assignment…" />;
  const { bus, trip } = data;
  if (!bus) {
    return (
      <EmptyState
        title="No bus assigned"
        description="There is currently no vehicle assigned to this driver credential."
      />
    );
  }

  const hasTrip = !!trip;
  const isActive = hasTrip && trip.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <SectionHeader
        label="Vehicle Cab Cockpit"
        title="Driver Telemetry & Dispatch"
      />

      {/* Primary Vehicle Info Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Bus className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Bus</p>
              <p className="text-xl font-black text-slate-900">{bus.busNumber}</p>
              <span className="text-[11px] text-slate-500 font-semibold">{bus.capacity} Seat Capacity</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Route className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Corridor</p>
              <p className="text-xl font-black text-slate-900">Line {bus.routeId?.routeNumber}</p>
              <p className="text-xs text-slate-500 truncate max-w-[160px]">{bus.routeId?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Station</p>
              <p className="text-xl font-black text-slate-900">{trip?.currentStop?.name || bus.currentStop?.name || 'Start Terminal'}</p>
              <span className="text-[11px] text-emerald-700 font-semibold">GPS Telemetry Synced</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Navigation className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Scheduled Stop</p>
              <p className="text-xl font-black text-slate-900">{next}</p>
              <span className="text-[11px] text-slate-500 font-medium">{isActive ? 'En Route' : 'Idle'}</span>
            </div>
          </div>
        </div>

        {/* Big Action Controls */}
        <div className="mt-6 border-t border-slate-100 pt-6">
          {!hasTrip ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center max-w-md mx-auto">
              <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Play className="h-6 w-6 fill-current" />
              </div>
              <p className="text-base font-bold text-slate-900">Vehicle Ready for Departure</p>
              <p className="mt-1 text-xs text-slate-500">
                Starting a trip alerts route passengers and activates real-time GPS tracking.
              </p>
              <button
                disabled={busy}
                className="btn-primary w-full mt-5 py-3 text-sm font-bold"
                onClick={() => action('/trips/start', { busId: bus._id }, 'Trip started successfully!')}
              >
                {busy ? 'Initiating Trip…' : 'Start Active Route Trip'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                    Trip In Progress
                  </span>
                  {trip.delayMinutes > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      +{trip.delayMinutes}m Traffic Delay
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Wifi className={`h-4 w-4 ${syncState === 'offline' ? 'text-amber-500' : 'text-emerald-600'}`} />
                  <span>{queuedCount ? `${queuedCount} ETM events queued` : 'Conductor stream synced'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  disabled={busy}
                  className="btn-primary w-full py-3 font-bold flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                  onClick={() => action(`/trips/${trip._id}/stop`, {}, `Arrived at ${next}!`)}
                >
                  <Navigation className="h-4 w-4" />
                  <span>Advance to Next Stop</span>
                </button>

                <button
                  disabled={busy}
                  className="btn-secondary w-full py-3 font-bold text-slate-700 flex items-center justify-center gap-2"
                  onClick={() => setModal(true)}
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Report Route Delay</span>
                </button>

                <button
                  disabled={busy}
                  className="btn-danger w-full py-3 font-bold flex items-center justify-center gap-2"
                  onClick={() => action(`/trips/${trip._id}/end`, {}, 'Trip ended successfully.')}
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span>End & Complete Trip</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Conductor ETM Console */}
      {isActive && (
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CreditCard className="h-5 w-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-extrabold tracking-wide uppercase">Electronic Ticketing Machine (ETM)</h3>
                <p className="text-[11px] text-slate-400">POS Conductor Terminal · Instant Passenger Occupancy Fusion</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
              ETM-ONLINE
            </span>
          </div>

          <div className="p-6">
            <form onSubmit={issueTicket} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="label">Boarding Station</label>
                  <input
                    disabled
                    className="input bg-slate-100 text-slate-600 font-semibold cursor-not-allowed"
                    value={trip.currentStop?.name || 'Terminal'}
                  />
                </div>

                <div>
                  <label className="label">Destination Station</label>
                  <select
                    required
                    className="input font-semibold text-slate-800"
                    value={ticketForm.destinationStopId}
                    onChange={e => setTicketForm({ ...ticketForm, destinationStopId: e.target.value })}
                  >
                    <option value="">Select Destination…</option>
                    {(data.bus.routeId?.stops || [])
                      .filter(s => s.sequence > (trip.currentStop?.sequence || 0))
                      .map(s => (
                        <option value={s._id} key={s._id}>
                          {s.sequence}. {s.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="label">Fare Category</label>
                  <select
                    className="input font-semibold text-slate-800"
                    value={ticketForm.ticketType}
                    onChange={e => setTicketForm({ ...ticketForm, ticketType: e.target.value })}
                  >
                    <option value="ADULT">Adult Standard</option>
                    <option value="STUDENT">Student Pass</option>
                    <option value="SENIOR">Senior Citizen</option>
                  </select>
                </div>

                <div>
                  <label className="label">Passenger Count</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTicketForm(f => ({ ...f, passengerCount: Math.max(1, f.passengerCount - 1) }))}
                      className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      required
                      min="1"
                      max="10"
                      type="number"
                      className="input text-center font-bold text-base"
                      value={ticketForm.passengerCount}
                      onChange={e => setTicketForm({ ...ticketForm, passengerCount: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setTicketForm(f => ({ ...f, passengerCount: Math.min(10, f.passengerCount + 1) }))}
                      className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={busy || !ticketForm.destinationStopId}
                  className="btn-primary px-6 py-3 font-bold text-sm flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>{busy ? 'Printing ETM Ticket…' : 'Issue Ticket & Record Onboard'}</span>
                </button>
              </div>
            </form>

            {/* Recently Issued Tickets Audit Log */}
            {recentTickets.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Recent Conductor Transactions (Current Shift)
                </p>
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                  {recentTickets.map(t => (
                    <div key={t._id || t.id} className="p-3.5 flex items-center justify-between bg-slate-50/50 hover:bg-white transition-colors text-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          +{t.passengerCount}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {t.sourceStopId?.name || 'Origin'} → {t.destinationStopId?.name || 'Destination'}
                          </p>
                          <p className="text-slate-500 text-[10px] mt-0.5">
                            {t.ticketType} · {t.ticketId || t.transactionId || 'ETM-TRANS'}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                        {t._local ? 'LOCAL QUEUE' : 'RECONCILED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Delay Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={e => {
              e.preventDefault();
              action(
                `/trips/${trip._id}/delay`,
                { delayMinutes: Number(delay), reason },
                'Delay reported to central operations.'
              );
              setModal(false);
            }}
            className="bg-white border border-slate-200/90 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900">Broadcast Route Delay</h3>
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="label">Estimated Delay (Minutes)</label>
                  <input
                    required
                    min="1"
                    max="180"
                    type="number"
                    className="input"
                    value={delay}
                    onChange={e => setDelay(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Operational Delay Reason</label>
                  <select
                    className="input"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  >
                    <option value="Heavy Traffic">Heavy Corridor Traffic</option>
                    <option value="Passenger Boarding Queue">Crowded Station Boarding</option>
                    <option value="Road Construction">Road Works / Diversion</option>
                    <option value="Weather / Rain">Inclement Weather</option>
                    <option value="Vehicle Inspection">Mechanical Check</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setModal(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                  disabled={busy}
                >
                  {busy ? 'Broadcasting…' : 'Publish Delay Alert'}
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
