import React from 'react';
import { crowdClass } from './UI';
import { ProgressBar } from './UI';
import { Clock, Users, AlertCircle, RefreshCw, Route } from 'lucide-react';

const stamp = v =>
  v
    ? `${Math.max(0, Math.round((Date.now() - new Date(v)) / 60000))} min ago`
    : 'Waiting for reports';

export default function BusCard({ bus, onReport, eta, userReport }) {
  const c = bus.crowd;
  const ticketing = bus.ticketing;

  const borderColor =
    c.crowdLevel === 'FULL' ? 'border-l-[#FF5C5C]' :
    c.crowdLevel === 'HIGH' ? 'border-l-[#F2B84B]' :
    c.crowdLevel === 'MEDIUM' ? 'border-l-[#F2B84B]' :
    c.crowdLevel === 'LOW' ? 'border-l-[#43D17A]' :
    'border-l-[#292E2B]';

  return (
    <article className={`panel-raised overflow-hidden border-l-4 ${borderColor}`}>
      <div className="flex items-center justify-between border-b border-[#292E2B] bg-[#1C201E] px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0D0F0E] text-sm font-black text-[#F3F5F2] border border-[#292E2B]">
            {bus.busNumber.slice(-4)}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F3F5F2] tracking-tight">{bus.busNumber}</h3>
            <p className="text-xs text-[#A4ABA6] mt-0.5 flex items-center gap-1.5">
              <Route className="h-3 w-3 text-[#9AAE8C]" />
              {bus.currentStop?.name || 'Stop updating'}
              {eta !== undefined && <span className="ml-1.5 text-[#6F7772]">· {eta ?? '—'} min ETA</span>}
            </p>
          </div>
        </div>
        <span className={crowdClass(c.crowdLevel)}>{c.crowdLevel}</span>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#6F7772]" />
            <div>
              <p className="text-sm font-bold text-[#F3F5F2]">{eta ?? '—'} min</p>
              <p className="text-xs text-[#6F7772]">ETA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#6F7772]" />
            <div>
              <p className="text-sm font-bold text-[#F3F5F2]">{c.availableSeats ?? '—'}</p>
              <p className="text-xs text-[#6F7772]">seats est.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#6F7772]" />
            <div>
              <p className="text-sm font-bold text-[#F3F5F2]">{bus.delayMinutes || 0} min</p>
              <p className="text-xs text-[#6F7772]">delay</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-[#6F7772]" />
            <div>
              <p className="text-sm font-bold text-[#F3F5F2]">{Math.round((c.confidence || 0) * 100)}%</p>
              <p className="text-xs text-[#6F7772]">confidence</p>
            </div>
          </div>
        </div>

        {ticketing && (
          <div className="mt-4">
            <ProgressBar value={ticketing.estimatedOnboard} max={bus.capacity} />
          </div>
        )}

        {ticketing && (
          <div className="mt-4 rounded-xl border border-[#9AAE8C]/25 bg-[#9AAE8C]/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9AAE8C]">ETM occupancy estimate</p>
              <span className={crowdClass(ticketing.crowdLevel)}>{ticketing.crowdLevel}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#A4ABA6]">
              <span><b className="text-[#F3F5F2]">{ticketing.estimatedOnboard}/{bus.capacity}</b> onboard</span>
              <span className="text-[#6F7772]">·</span>
              <span><b className="text-[#F3F5F2]">{ticketing.availableSeats}</b> seats available</span>
            </div>
            <p className="mt-2 text-xs text-[#6F7772]">
              Based on {ticketing.ticketEventCount} source-to-destination ETM transactions · {Math.round(ticketing.confidence * 100)}% confidence
            </p>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-dashed border-[#292E2B] bg-[#1C201E] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#A4ABA6]">Network estimate</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="text-[#A4ABA6]"><span className="font-semibold text-[#F3F5F2]">{c.availableSeats ?? '—'}</span> seats estimated</span>
            <span className="text-[#6F7772]">·</span>
            <span className="text-[#A4ABA6]">Updated <span className="font-semibold text-[#F3F5F2]">{c.lastUpdated ? stamp(c.lastUpdated) : '—'}</span></span>
          </div>
        </div>

        {userReport && (
          <div className="mt-3 rounded-lg border border-dashed border-[#292E2B] bg-[#151817] p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#A4ABA6]">Your last report</p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-sm">
              <span className={crowdClass(userReport.crowdLevel)}>{userReport.crowdLevel}</span>
              <span className="text-[#A4ABA6]">{userReport.availableSeats} seats reported</span>
              <span className="text-xs text-[#6F7772]">{stamp(userReport.timestamp)}</span>
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-[#6F7772]">Confidence reflects agreement, volume, and freshness.</p>
        <button className="btn-secondary mt-4 w-full" onClick={() => onReport(bus)}>
          Report crowd
        </button>
      </div>
    </article>
  );
}