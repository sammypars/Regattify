import { useEffect, useState } from 'react';
import { initials } from '../lib';

export function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <rect width="30" height="30" rx="8" fill="#1F4FD8" />
      <path d="M6 18.5c3 2.2 15 2.2 18 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 8l10 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 8L10 20" stroke="#9DB6F5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ClubBadge({ club, size = 34 }) {
  if (!club) return null;
  const light = ['#0E1726', '#1F4FD8', '#12724A', '#B42318', '#6D28D9'].includes(club.color);
  return (
    <span className="badge" style={{ background: club.color, color: light ? '#fff' : '#0E1726', width: size, height: size, flexBasis: size }}>
      {(club.short || initials(club.name)).slice(0, 3)}
    </span>
  );
}

const paths = {
  home: <path d="M3.5 10L11 4l7.5 6v8a1 1 0 01-1 1h-13a1 1 0 01-1-1v-8z" strokeLinejoin="round" />,
  flag: <path d="M5 19V3.5M5 4h11l-2.5 3.5L16 11H5" strokeLinecap="round" strokeLinejoin="round" />,
  list: <path d="M8 6h10M8 11h10M8 16h10M4 6h.01M4 11h.01M4 16h.01" strokeLinecap="round" />,
  cal: <><rect x="3" y="5" width="16" height="14" rx="2" /><path d="M3 9h16M8 3v4M14 3v4" strokeLinecap="round" /></>,
  club: <><circle cx="8" cy="8" r="3" /><circle cx="15" cy="9" r="2.5" /><path d="M2.5 18c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M13.5 13.6c2.4-.4 4.6.9 5.5 3.9" strokeLinecap="round" /></>,
  search: <><circle cx="9" cy="9" r="6" /><path d="M14 14l4.5 4.5" strokeLinecap="round" /></>,
  back: <path d="M13 4.5L7 11l6 6.5" strokeLinecap="round" strokeLinejoin="round" />,
  chev: <path d="M8 4.5l6 6.5-6 6.5" strokeLinecap="round" strokeLinejoin="round" />,
  plus: <path d="M11 4v14M4 11h14" strokeLinecap="round" />,
  check: <path d="M4.5 11.5l4 4 9-9" strokeLinecap="round" strokeLinejoin="round" />,
  clock: <><circle cx="11" cy="11" r="8" /><path d="M11 7v4l3 2" strokeLinecap="round" /></>,
  share: <path d="M11 3v10M7 7l4-4 4 4M4 12v6h14v-6" strokeLinecap="round" strokeLinejoin="round" />,
  x: <path d="M5 5l12 12M17 5L5 17" strokeLinecap="round" />,
  info: <><circle cx="11" cy="11" r="8" /><path d="M11 10v5M11 7.5v.01" strokeLinecap="round" /></>,
  arrow: <path d="M3 11h15M13 6l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />,
};
export function Icon({ name, size = 20, color = 'currentColor', width = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={width} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function Toast({ msg, onDone }) {
  useEffect(() => { if (!msg) return; const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [msg, onDone]);
  if (!msg) return null;
  return <div className="toast" role="status">{msg}</div>;
}
export function useToast() {
  const [msg, setMsg] = useState('');
  return [msg, setMsg, <Toast key="toast" msg={msg} onDone={() => setMsg('')} />];
}

export function Bar({ value, max }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <span className={`bar${value >= max ? ' full' : ''}`}><i style={{ width: `${pct}%` }} /></span>;
}

export function Empty({ title, children }) {
  return <div className="empty"><div className="bold" style={{ color: 'var(--ink)', marginBottom: 4 }}>{title}</div>{children}</div>;
}

export function Search({ value, onChange, placeholder, label }) {
  return (
    <label className="search">
      <Icon name="search" size={18} color="#5B6576" />
      <span className="sr">{label || placeholder}</span>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
