import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5" aria-label="TransitAI Mesh home">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#9AAE8C] shadow-[0_12px_24px_rgba(154,174,140,0.18)] border border-[#9AAE8C]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B0D0C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <span className="flex flex-col">
        <span className="text-base font-black tracking-tight text-[#F3F5F2] leading-none">
          TransitAI Mesh
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9AAE8C] leading-none mt-0.5">
          Live transit intelligence
        </span>
      </span>
    </Link>
  );
}

