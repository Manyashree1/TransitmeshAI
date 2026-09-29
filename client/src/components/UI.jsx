import React from 'react';
import { Loader2, AlertCircle, Inbox, MapPin, Clock, Users, AlertTriangle, Wifi, Route, Bus as BusIcon, CheckCircle2 } from 'lucide-react';

export const crowdClass = l => `badge crowd-${l || 'UNKNOWN'}`;

export function Loading({ label = 'Loading transit intelligence…' }) {
  return (
    <div className="panel p-6 text-slate-600 bg-white" aria-live="polite">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span className="text-sm font-semibold text-slate-800">{label}</span>
      </div>
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-rose-100 flex items-center justify-center">
          <AlertCircle className="h-4 w-4 text-rose-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">System Notification</p>
          <p className="mt-0.5 text-sm text-slate-600 leading-normal">{message}</p>
        </div>
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary text-xs px-3 py-1.5 shrink-0">
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here', description, action }) {
  return (
    <div className="empty-state">
      <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Inbox className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-base font-bold text-slate-900">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="text-sm font-semibold text-slate-900">{message}</span>
      </div>
    </div>
  );
}

export function SectionHeader({ label, title, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-slate-200/80">
      <div>
        {label && <p className="subheading">{label}</p>}
        {title && <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">{title}</h1>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusBadge({ children, variant = 'default' }) {
  const styles = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    live: 'bg-blue-50 text-blue-700 border border-blue-200',
  };
  return <span className={`badge ${styles[variant] || styles.default}`}>{children}</span>;
}

export function ProgressBar({ value, max = 100, showLabel = true }) {
  const ratio = Math.min(1, Math.max(0, value / max));
  const percent = Math.round(ratio * 100);
  let fillClass = 'bg-blue-600';
  let badgeColor = 'text-blue-600 bg-blue-50';

  if (percent >= 90) {
    fillClass = 'bg-rose-500';
    badgeColor = 'text-rose-600 bg-rose-50';
  } else if (percent >= 70) {
    fillClass = 'bg-amber-500';
    badgeColor = 'text-amber-600 bg-amber-50';
  } else {
    fillClass = 'bg-emerald-500';
    badgeColor = 'text-emerald-600 bg-emerald-50';
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="font-semibold text-slate-500 uppercase tracking-wider">Passenger Load</span>
          <span className={`font-bold px-2 py-0.5 rounded-md ${badgeColor}`}>
            {value} / {max} ({percent}%)
          </span>
        </div>
      )}
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/60">
        <div className={`h-full rounded-full ${fillClass} transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function MetricCard({ icon: Icon, label, value, subtext, accent = 'blue' }) {
  const accentBorder = {
    blue: 'border-t-4 border-t-blue-600',
    emerald: 'border-t-4 border-t-emerald-500',
    amber: 'border-t-4 border-t-amber-500',
    rose: 'border-t-4 border-t-rose-500',
    slate: 'border-t-4 border-t-slate-400',
  };

  const iconBg = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-50 text-slate-600',
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ${accentBorder[accent] || accentBorder.blue}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</p>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
          {subtext && <p className="text-xs text-slate-500 mt-1 font-medium">{subtext}</p>}
        </div>
        {Icon && (
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg[accent] || iconBg.blue}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function AlertBar({ type = 'info', title, message }) {
  const styles = {
    info: 'border-blue-200 bg-blue-50/80 text-blue-900',
    warning: 'border-amber-200 bg-amber-50/80 text-amber-900',
    danger: 'border-rose-200 bg-rose-50/80 text-rose-900',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${styles[type] || styles.info}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-current opacity-80" />
        <div className="flex-1">
          <p className="text-sm font-bold leading-tight">{title}</p>
          {message && <p className="text-xs opacity-90 mt-1 leading-normal">{message}</p>}
        </div>
      </div>
    </div>
  );
}

export function StopTimeline({ stops, currentStopId, buses = [] }) {
  const currentIndex = stops.findIndex(s => String(s._id) === String(currentStopId));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
      <div className="space-y-0">
        {stops.map((stop, i) => {
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;
          const isLast = i === stops.length - 1;
          const busHere = buses.filter(b => String(b.currentStop?._id) === String(stop._id));

          return (
            <div key={stop._id} className="relative flex gap-4 pb-5 last:pb-0">
              <div className="flex flex-col items-center">
                <span
                  className={`z-10 grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-all duration-200 ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-4 ring-blue-100 scale-110'
                      : isPast
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isPast ? '✓' : i + 1}
                </span>
                {!isLast && (
                  <span
                    className={`absolute left-[13px] top-7 h-[calc(100%-8px)] border-l-2 transition-colors duration-200 ${
                      isPast ? 'border-emerald-300' : 'border-slate-200'
                    }`}
                  />
                )}
              </div>
              <div className="min-w-0 pt-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-bold ${isCurrent ? 'text-blue-900 font-extrabold' : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                    {stop.name}
                  </p>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" /> Current Vehicle Stop
                    </span>
                  )}
                </div>
                {busHere.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {busHere.map(b => (
                      <span key={b._id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-900 text-white shadow-sm">
                        <BusIcon className="h-3 w-3 text-emerald-400" />
                        {b.busNumber}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
