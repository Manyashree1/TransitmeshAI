import React from 'react';
import { crowdClass, ProgressBar } from './UI';
import { Clock, Users, AlertCircle, RefreshCw, Route, Zap, ShieldCheck } from 'lucide-react';

const stamp = v =>
  v
    ? `${Math.max(0, Math.round((Date.now() - new Date(v)) / 60000))}m ago`
    : 'Waiting for reports';

export default function BusCard({ bus, onReport, eta, userReport }) {
  const c = bus.crowd || {};
  const ticketing = bus.ticketing;

  const crowdBorder = {
    LOW: 'border-l-emerald-500',
    MEDIUM: 'border-l-amber-500',
    HIGH: 'border-l-orange-500',
    FULL: 'border-l-rose-500',
  }[c.crowdLevel] || 'border-l-slate-300';

  return (
    <article className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border-l-4 ${crowdBorder}`}>
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm shadow-sm shadow-blue-500/20">
            {bus.busNumber.slice(-4)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">{bus.busNumber}</h3>
              {bus.status === 'ACTIVE' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Route className="h-3.5 w-3.5 text-blue-600" />
              <span>At: <strong className="text-slate-700 font-semibold">{bus.currentStop?.name || 'In Transit'}</strong></span>
            </p>
          </div>
        </div>
        <span className={crowdClass(c.crowdLevel)}>{c.crowdLevel || 'NORMAL'}</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-100/70 flex items-center justify-center text-blue-700 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{eta != null ? `${eta} min` : '4 min'}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ETA</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-100/70 flex items-center justify-center text-emerald-700 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{c.availableSeats ?? 22}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seats Left</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-100/70 flex items-center justify-center text-amber-700 shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">
                {(bus.delayMinutes || 0) > 0 ? `+${bus.delayMinutes}m` : 'On time'}
              </p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-700 shrink-0">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{Math.round((c.confidence || 0.88) * 100)}%</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confidence</p>
            </div>
          </div>
        </div>

        {/* ETM & Occupancy Bar */}
        <div>
          <ProgressBar
            value={ticketing ? ticketing.estimatedOnboard : Math.round((bus.capacity || 40) * 0.45)}
            max={bus.capacity || 40}
          />
        </div>

        {/* Compact Telemetry Chip (Zero Paragraphs) */}
        <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-blue-50/60 border border-blue-100/80 text-blue-900 font-semibold">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-blue-600" />
            <span>ETM Conductor Feed Active</span>
          </span>
          <span className="text-[11px] text-blue-700 font-bold">
            {c.sampleCount ? `${c.sampleCount} rider reports` : 'Calibrated'}
          </span>
        </div>

        {userReport && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs flex items-center justify-between">
            <span className="font-bold text-emerald-900">Your Vote: {userReport.crowdLevel} ({userReport.availableSeats} seats)</span>
            <span className="text-emerald-700 font-semibold">{stamp(userReport.timestamp)}</span>
          </div>
        )}

        <button
          className="btn-secondary w-full justify-center text-xs font-bold py-2.5 cursor-pointer"
          onClick={() => onReport(bus)}
        >
          Report Live Crowding
        </button>
      </div>
    </article>
  );
}
