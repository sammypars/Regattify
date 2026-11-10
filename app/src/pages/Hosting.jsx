import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore, regattaStats } from '../store';
import { fmtRange, monShort, dayNum, uid, addDays, todayIso, money } from '../lib';
import { regattaStatus } from './Regattas';

export function Hosting() {
  const { db } = useStore();
  const mine = db.regattas.filter((r) => r.hostClubId === db.myClubId).sort((a, b) => b.startDate.localeCompare(a.startDate));
  return (
    <main className="page narrow">
      <div className="head">
        <div><h1>Hosting</h1><p className="muted" style={{ marginTop: 4 }}>Regattas your club runs.</p></div>
        <Link to="/host/new" className="btn primary">Host a new regatta</Link>
      </div>
      {mine.length === 0 && <div className="card empty">You haven’t hosted a regatta yet.</div>}
      {mine.map((r) => {
        const st = regattaStatus(r);
        const s = regattaStats(db, r.id);
        return (
          <article key={r.id} className="card stack">
            <div className="hstack" style={{ flexWrap: 'nowrap', gap: 16 }}>
              <div className="datetile"><div className="m">{monShort(r.startDate)}</div><div className="d">{dayNum(r.startDate)}</div></div>
              <div className="grow"><div className="hstack" style={{ gap: 8 }}><span className="bold" style={{ fontSize: 17 }}>{r.name}</span><span className={`pill ${st.tone}`}>{st.text}</span></div>
                <div className="small muted">{fmtRange(r.startDate, r.endDate)} · {r.venue || 'Venue not set'} · {s.clubs} clubs · {s.entries} entries · {money(s.collected - s.refunded)} collected</div></div>
            </div>
            <div className="hstack">
              <Link to={`/host/${r.id}`} className="btn primary">Open console</Link>
              <Link to={`/host/${r.id}/setup`} className="btn">Setup</Link>
              <Link to={`/host/${r.id}/payouts`} className="btn ghost">Payments</Link>
            </div>
          </article>
        );
      })}
    </main>
  );
}

export function NewRegatta() {
  const { db, update } = useStore();
  const nav = useNavigate();
  const made = useRef(false);
  useEffect(() => {
    if (made.current) return; made.current = true;
    const id = uid('r');
    const start = addDays(todayIso(), 60);
    update((d) => {
      d.regattas.push({
        id, name: '', hostClubId: d.myClubId, startDate: start, endDate: start, venue: '', status: 'draft', format: 'Sprint', course: '1,500 m', lanes: 6,
        entriesOpen: addDays(todayIso(), 7), entriesClose: addDays(start, -5), lineupDeadlineHrs: 2, lateEntries: 'no', maxCrews: 3,
        refundPolicy: 'Full refund before the draw', feePaidBy: 'club', waiver: true, memberships: true, composite: true,
        fees: { eight: 0, four: 0, two: 0, one: 0 }, events: [], firstRace: 480, lastRace: 1020, interval: 7, turnaround: 45,
        drawPublished: false, delayMin: 0, payoutConnected: false, address: '', parking: '', docks: '', notes: '', contact: d.session.email, results: {},
      });
    });
    nav(`/host/${id}/setup`, { replace: true });
  }, [db, update, nav]);
  return <main className="page"><p className="muted">Starting a new regatta…</p></main>;
}
