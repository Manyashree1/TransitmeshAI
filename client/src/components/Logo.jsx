import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-3 group" aria-label="TransitMesh AI home">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="16" height="16" x="4" y="3" rx="3" />
          <path d="M4 11h16" />
          <path d="M8 15h.01" />
          <path d="M16 15h.01" />
          <path d="M6 19v2" />
          <path d="M18 19v2" />
        </svg>
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/20" />
      </div>
      <div className="flex flex-col">
        <span className="text-base font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
          TransitMesh<span className="text-blue-600">.ai</span>
        </span>
        <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
          Live Fleet Intelligence
        </span>
      </div>
    </Link>
  );
}
