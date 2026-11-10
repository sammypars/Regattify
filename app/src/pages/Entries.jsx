import { Link } from 'react-router-dom';
import { useStore, entriesFor, entryInfo } from '../store';
import { fmtRange, monShort, dayNum, plural, money, todayIso } from '../lib';
import { Empty } from '../components/ui';
import { regattaStatus } from './Regattas';

export default function Entries() {
  const { db } = useStore();
  const today = todayIso();
  const regattas = db.regattas
    .filter((r) => entriesFor(db, r.id, db.myClubId).length)
    .sort((a, b) => (a.endDate < today) - (b.endDate < today) || a.startDate.localeCompare(b.startDate));

  return (
    <main className="page narrow">
      <div className="head">
        <div><h1>Entries</h1><p className="muted" style={{ marginTop: 4 }}>Every regatta your club has entered.</p></div>
        <Link to="/regattas" className="btn primary">Enter a regatta</Link>
      </div>
      {regattas.length === 0 && <div className="card"><Empty title="No entries yet"><Link to="/regattas">Find a regatta to enter</Link></Empty></div>}
      {regattas.map((r) => {
        const mine = entriesFor(db, r.id, db.myClubId);
        const drafts = mine.filter((e) => e.status === 'draft');
        const full = mine.filter((e) => entryInfo(db, e).full).length;
        const owed = drafts.reduce((s, e) => s + entryInfo(db, e).fee, 0);
        const unpaid = mine.filter((e) => e.status === 'submitted' && !e.paid).length;
        const st = regattaStatus(r);
        return (
          <section key={r.id} className="card stack">
            <div className="hstack" style={{ flexWrap: 'nowrap', gap: 16 }}>
              <div className="datetile"><div className="m">{monShort(r.startDate)}</div><div className="d">{dayNum(r.startDate)}</div></div>
              <div className="grow">
                <Link to={`/r/${r.id}`} className="bold" style={{ fontSize: 17, color: 'var(--ink)', textDecoration: 'none' }}>{r.name}</Link>
                <div className="small muted">{fmtRange(r.startDate, r.endDate)} · {st.text}</div>
              </div>
            </div>
            <div className="grid-4">
              <div className="stat"><div className="k">Crews</div><div className="v">{mine.length}</div></div>
              <div className="stat"><div className="k">Lineups full</div><div className="v">{full}/{mine.length}</div></div>
              <div className="stat"><div className="k">Not submitted</div><div className="v" style={{ color: drafts.length ? 'var(--orange-ink)' : undefined }}>{drafts.length}</div>{drafts.length > 0 && <div className="s">{money(owed)} to pay</div>}</div>
              <div className="stat"><div className="k">Invoices open</div><div className="v">{unpaid}</div></div>
            </div>
            <div className="hstack">
              {st.open && <Link to={`/r/${r.id}/enter`} className={`btn ${drafts.length ? 'primary' : ''}`}>{drafts.length ? `Finish ${plural(drafts.length, 'entry', 'entries')}` : 'Add events'}</Link>}
              <Link to={`/lineups/${r.id}`} className="btn">Lineups</Link>
              <Link to={`/schedule/${r.id}`} className="btn ghost">Schedule</Link>
            </div>
          </section>
        );
      })}
    </main>
  );
}
