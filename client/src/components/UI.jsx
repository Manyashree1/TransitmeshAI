import React from 'react';
import { Loader2, AlertCircle, Inbox, Activity, MapPin, Clock, Users, AlertTriangle, Wifi, Route, Navigation, Play, Square, Bus as BusIcon } from 'lucide-react';

export const crowdClass = l => `badge crowd-${l || 'UNKNOWN'}`;

export function Loading({ label = 'Loading transit intelligence…' }) {
  return (
    <div className="panel animate-pulse text-[#A4ABA6]" aria-live="polite">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#9AAE8C]" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-[#FF5C5C]/10 flex items-center justify-center">
          <AlertCircle className="h-4 w-4 text-[#FF5C5C]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-[#F3F5F2]">Unable to load</p>
          <p className="mt-1 text-sm text-[#A4ABA6]">{message}</p>
        </div>
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary text-xs px-4 py-2">
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
      <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#1C201E] flex items-center justify-center">
        <Inbox className="h-6 w-6 text-[#6F7772]" />
      </div>
      <p className="text-base font-bold text-[#F3F5F2]">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-[#A4ABA6] leading-relaxed max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-2.5 rounded-full bg-[#9AAE8C] shrink-0 shadow-lg shadow-[#9AAE8C]/40" />
        <span className="text-sm font-semibold text-[#F3F5F2]">{message}</span>
      </div>
    </div>
  );
}

export function SectionHeader({ label, title, action }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {label && <p className="subheading">{label}</p>}
        {title && <h1 className="mt-2 display">{title}</h1>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusBadge({ children, variant = 'default' }) {
  const styles = {
    default: 'bg-[#1C201E] text-[#F3F5F2] border border-[#292E2B]',
    success: 'bg-[#43D17A]/12 text-[#43D17A] border border-[#43D17A]/35',
    warning: 'bg-[#F2B84B]/12 text-[#F2B84B] border border-[#F2B84B]/35',
    danger: 'bg-[#FF5C5C]/12 text-[#FF5C5C] border border-[#FF5C5C]/35',
    live: 'bg-[#9AAE8C]/10 text-[#9AAE8C] border border-[#9AAE8C]/35',
  };
  return <span className={`badge ${styles[variant] || styles.default}`}>{children}</span>;
}

export function SkeletonCard() {
  return (
    <div className="panel space-y-4">
      <div className="skeleton h-6 w-32" />
      <div className="skeleton h-4 w-48" />
      <div className="skeleton h-24 w-full" />
    </div>
  );
}

export function ProgressBar({ value, max = 100, showLabel = true }) {
  const ratio = Math.min(1, Math.max(0, value / max));
  const percent = Math.round(ratio * 100);
  let fillClass = 'progress-fill';
  if (percent >= 90) fillClass = 'progress-fill-danger';
  else if (percent >= 70) fillClass = 'progress-fill-warning';

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-[#A4ABA6] uppercase tracking-wider">Occupancy</span>
          <span className="text-xs font-bold text-[#F3F5F2]">{value}/{max}</span>
        </div>
      )}
      <div className="progress-track">
        <div className={fillClass} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function MetricCard({ icon: Icon, label, value, subtext, accent = 'lime' }) {
  const accentColors = {
    lime: 'text-[#9AAE8C]',
    amber: 'text-[#F2B84B]',
    rose: 'text-[#FF5C5C]',
    green: 'text-[#43D17A]',
    slate: 'text-[#A4ABA6]',
  };

  return (
    <div className="panel-raised p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="metric-label mb-2">{label}</p>
          <p className={`text-3xl font-black tracking-tight ${accentColors[accent] || accentColors.lime}`}>
            {value}
          </p>
          {subtext && <p className="text-xs text-[#6F7772] mt-1 font-medium">{subtext}</p>}
        </div>
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-[#1C201E] flex items-center justify-center text-[#A4ABA6] border border-[#292E2B]">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function AlertBar({ type = 'info', title, message }) {
  const styles = {
    info: 'border-[#9AAE8C]/35 bg-[#9AAE8C]/8 text-[#F3F5F2]',
    warning: 'border-[#F2B84B]/35 bg-[#F2B84B]/8 text-[#F3F5F2]',
    danger: 'border-[#FF5C5C]/35 bg-[#FF5C5C]/8 text-[#F3F5F2]',
  };

  return (
    <div className={`panel border-l-4 ${styles[type] || styles.info}`}>
      <div className="p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-[#9AAE8C]" />
        <div className="flex-1">
          <p className="text-sm font-bold">{title}</p>
          {message && <p className="text-xs opacity-80 mt-1 text-[#A4ABA6]">{message}</p>}
        </div>
      </div>
    </div>
  );
}

export function StopTimeline({ stops, currentStopId, buses = [] }) {
  const currentIndex = stops.findIndex(s => String(s._id) === String(currentStopId));

  return (
    <div className="panel p-5">
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
                  className={`z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-black transition-all duration-300 ${
                    isCurrent
                      ? 'border-[#9AAE8C] bg-[#9AAE8C] text-[#0D0F0E] shadow-lg shadow-[#9AAE8C]/25 scale-110'
                      : isPast
                      ? 'border-[#292E2B] bg-[#1C201E] text-[#F3F5F2]'
                      : 'border-[#292E2B] bg-[#151817] text-[#6F7772]'
                  }`}
                >
                  {isPast ? '✓' : i + 1}
                </span>
                {!isLast && (
                  <span className={`absolute left-[15px] top-8 h-[calc(100%-8px)] border-l-2 transition-colors duration-300 ${
                    isPast ? 'border-[#9AAE8C]/35' : 'border-[#292E2B]'
                  }`} />
                )}
              </div>
              <div className="min-w-0 pt-1 flex-1">
                <p className={`text-sm font-bold transition-colors duration-300 ${isCurrent ? 'text-[#F3F5F2]' : 'text-[#A4ABA6]'}`}>
                  {stop.name}
                </p>
                {busHere.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {busHere.map(b => (
                      <span key={b._id} className="badge bg-[#1C201E] text-[#F3F5F2] border border-[#292E2B] text-[10px]">
                        {b.busNumber}
                      </span>
                    ))}
                  </div>
                )}
                {isCurrent && <p className="text-[10px] font-bold text-[#9AAE8C] uppercase tracking-wider mt-1">Current stop</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
