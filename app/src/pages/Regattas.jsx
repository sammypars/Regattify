import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore, getClub, entriesFor } from '../store';
import { fmtRange, monShort, dayNum, todayIso, untilText, daysUntil, fmtDate } from '../lib';
import { Search, Icon } from '../components/ui';

export function regattaStatus(r) {
  const today = todayIso();
  if (r.status === 'draft') return { tone: 'gray', text: 'Draft · not public', open: false };
  if (r.endDate < today) return { tone: 'gray', text: 'Finished', open: false };
  if (r.startDate <= today) return { tone: 'solid', text: 'Racing now', open: false };
  if (r.entriesOpen > today) return { tone: 'gray', text: `Entries open ${fmtDate(r.entriesOpen)}`, open: false };
  if (r.entriesClose < today) return { tone: 'blue', text: 'Entries closed', open: false };
  return { tone: daysUntil(r.entriesClose) <= 3 ? 'orange' : 'green', text: `Entries close ${untilText(r.entriesClose)}`, open: true };
}

export default function Regattas() {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const [when, setWhen] = useState('upcoming');
  const today = todayIso();
  const list = db.regattas
    .filter((r) => r.status !== 'draft' || r.hostClubId === db.myClubId)
    .filter((r) => (when === 'upcoming' ? r.endDate >= today : r.endDate < today))
    .filter((r) => !q || `${r.name} ${r.venue} ${getClub(db, r.hostClubId)?.name}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (when === 'upcoming' ? a.startDate.localeCompare(b.startDate) : b.startDate.localeCompare(a.startDate)));

  return (
    <main className="page narrow">
      <div className="head">
        <div><h1>Regattas</h1><p className="muted" style={{ marginTop: 4 }}>Anyone can view a regatta’s events, schedule and results. No login needed.</p></div>
      </div>
      <div className="hstack">
        <div className="grow" style={{ flexBasis: 260 }}><Search value={q} onChange={setQ} placeholder="Search regattas, venues or host clubs" /></div>
        <div className="seg" role="tablist" aria-label="When">
          <button role="tab" aria-selected={when === 'upcoming'} className={when === 'upcoming' ? 'on' : ''} onClick={() => setWhen('upcoming')}>Upcoming</button>
          <button role="tab" aria-selected={when === 'past'} className={when === 'past' ? 'on' : ''} onClick={() => setWhen('past')}>Past</button>
        </div>
      </div>
      <div className="stack">
        {list.length === 0 && <div className="card empty">No regattas match.</div>}
        {list.map((r) => {
          const st = regattaStatus(r);
          const mine = db.myClubId ? entriesFor(db, r.id, db.myClubId).length : 0;
          return (
            <Link key={r.id} to={`/r/${r.id}`} className="card tight hstack" style={{ textDecoration: 'none', color: 'var(--ink)', gap: 16, flexWrap: 'nowrap' }}>
              <div className="datetile"><div className="m">{monShort(r.startDate)}</div><div className="d">{dayNum(r.startDate)}</div></div>
              <div className="grow">
                <div className="hstack" style={{ gap: 8 }}>
                  <span className="bold" style={{ fontSize: 17 }}>{r.name}</span>
                  <span className={`pill ${st.tone}`}>{st.text}</span>
                  {mine > 0 && <span className="pill blue">You have {mine}</span>}
                </div>
                <div className="small muted">{fmtRange(r.startDate, r.endDate)} · {r.venue} · {r.format} · hosted by {getClub(db, r.hostClubId)?.name}</div>
              </div>
              <Icon name="chev" color="#8792A2" />
            </Link>
          );
        })}
      </div>
    </main>
  );
}
