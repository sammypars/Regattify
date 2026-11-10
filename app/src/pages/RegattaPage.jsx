import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore, getRegatta, getClub, fieldCount, entriesFor, getEvent, raceSlot } from '../store';
import { fmtRange, fmtDate, fmtDay, fmtTime, money, FEE_LABELS, CATEGORIES, launchTime, dayOfEvent } from '../lib';
import { Bar, Empty } from '../components/ui';
import { regattaStatus } from './Regattas';

export default function RegattaPage() {
  const { id } = useParams();
  const { db } = useStore();
  const r = getRegatta(db, id);
  const [tab, setTab] = useState('overview');
  const [cat, setCat] = useState('All');
  if (!r) return <main className="page"><Empty title="Regatta not found"><Link to="/regattas">Back to regattas</Link></Empty></main>;
  const st = regattaStatus(r);
  const host = getClub(db, r.hostClubId);
  const cats = ['All', ...CATEGORIES.filter((c) => r.events.some((e) => e.cat === c))];
  const events = r.events.filter((e) => cat === 'All' || e.cat === cat).sort((a, b) => a.day - b.day || a.time - b.time);
  const clubsEntered = new Set(entriesFor(db, r.id).filter((e) => e.status === 'submitted').map((e) => e.clubId)).size;
  const signedIn = !!(db.session && db.myClubId);
  const hosting = r.hostClubId === db.myClubId;

  const dates = [
    { when: fmtDate(r.entriesOpen), what: 'Entries open' },
    { when: fmtDate(r.entriesClose), what: 'Entries close, 11:59 pm' },
    { when: 'After close', what: 'Draw and schedule posted' },
    { when: fmtRange(r.startDate, r.endDate), what: 'Race days' },
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-in">
          <div className="hstack" style={{ gap: 18, alignItems: 'flex-start' }}>
            <span className="badge" style={{ width: 64, height: 64, flexBasis: 64, borderRadius: 16, background: '#fff', color: 'var(--navy-2)', fontFamily: 'var(--display)', fontSize: 18 }}>{host?.short}</span>
            <div className="grow" style={{ flexBasis: 300 }}>
              <div className="hstack" style={{ gap: 8, marginBottom: 6 }}>
                <span className="pill gold">{st.text}</span>
                <span className="pill" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}>{r.format} · {r.course}{r.format === 'Sprint' ? ` · ${r.lanes} lanes` : ''}</span>
              </div>
              <h1 style={{ fontSize: 36 }}>{r.name}</h1>
              <p className="sub" style={{ marginTop: 4 }}>{fmtRange(r.startDate, r.endDate)}, {r.startDate.slice(0, 4)} · {r.venue} · Hosted by {host?.name}</p>
            </div>
            <div className="hstack">
              {hosting && <Link to={`/host/${r.id}`} className="btn" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>Manage</Link>}
              {st.open && <Link to={signedIn ? `/r/${r.id}/enter` : '/signup'} className="btn lg" style={{ background: '#fff' }}>Enter your club</Link>}
            </div>
          </div>
          <div className="tabs" role="tablist" aria-label="Regatta sections">
            {[['overview', 'Overview'], ['events', `Events · ${r.events.length}`], ['schedule', 'Schedule'], ['results', 'Results'], ['info', 'Venue and rules']].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
        </div>
      </section>

      <main className="page">
        {tab === 'overview' && (
          <div className="row">
            <div className="main-col">
              <section className="card">
                <h2 style={{ marginBottom: 14 }}>Key dates</h2>
                <div className="grid-4">
                  {dates.map((d, i) => (
                    <div key={i} className="stack-sm">
                      <div className="progress" style={{ height: 6 }}><i style={{ width: i === 0 ? '100%' : '0%' }} /></div>
                      <div className="bold small">{d.when}</div>
                      <div className="small muted">{d.what}</div>
                    </div>
                  ))}
                </div>
              </section>
              <EventsTable r={r} events={events.slice(0, 8)} db={db} />
              {r.events.length > 8 && <button className="btn" onClick={() => setTab('events')}>See all {r.events.length} events</button>}
            </div>
            <aside className="side-col">
              <section className="card accent stack">
                <h2 style={{ fontSize: 18 }}>Fees per entry</h2>
                {Object.entries(FEE_LABELS).map(([k, label]) => (
                  <div key={k} className="spread small"><span className="muted">{label}</span><span className="num">{money(Number(r.fees[k] || 0))}</span></div>
                ))}
                <p className="small muted">Entries close <strong style={{ color: 'var(--ink)' }}>{fmtDay(r.entriesClose)}</strong>. Lineups can change until {r.lineupDeadlineHrs} hours before each race.</p>
                {st.open && <Link to={signedIn ? `/r/${r.id}/enter` : '/signup'} className="btn primary block">Start entries</Link>}
              </section>
              <section className="card stack">
                <h2 style={{ fontSize: 18 }}>At a glance</h2>
                <div className="spread small"><span className="muted">Clubs entered</span><span className="bold">{clubsEntered}</span></div>
                <div className="spread small"><span className="muted">Events</span><span className="bold">{r.events.length}</span></div>
                <div className="spread small"><span className="muted">Contact</span><span>{r.contact || '—'}</span></div>
              </section>
            </aside>
          </div>
        )}

        {tab === 'events' && (
          <>
            <div className="chips">{cats.map((c) => <button key={c} className={`chip${cat === c ? ' on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}</div>
            <EventsTable r={r} events={events} db={db} />
          </>
        )}

        {tab === 'schedule' && <PublicSchedule r={r} db={db} />}

        {tab === 'results' && (
          <section className="card"><Empty title="No results yet">Results show up here, race by race, as soon as they’re posted on race day.</Empty></section>
        )}

        {tab === 'info' && (
          <div className="grid-2">
            <section className="card stack">
              <h2 style={{ fontSize: 18 }}>Venue</h2>
              <p><strong>Where:</strong> {r.venue}{r.address ? `, ${r.address}` : ''}</p>
              <p><strong>Trailer parking:</strong> {r.parking || 'Posted closer to race day'}</p>
              <p><strong>Docks:</strong> {r.docks || 'Posted closer to race day'}</p>
              {r.notes && <p><strong>Traffic and safety:</strong> {r.notes}</p>}
            </section>
            <section className="card stack">
              <h2 style={{ fontSize: 18 }}>Rules</h2>
              <p><strong>Late entries:</strong> {r.lateEntries === 'no' ? 'Not accepted' : 'Accepted with host approval and a late fee'}</p>
              <p><strong>Lineup changes:</strong> until {r.lineupDeadlineHrs} hours before each race</p>
              <p><strong>Scratches:</strong> {r.refundPolicy}</p>
              <p><strong>Crews per club per event:</strong> up to {r.maxCrews}</p>
              <p><strong>Composite crews:</strong> {r.composite ? 'Allowed' : 'Not allowed'}</p>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function EventsTable({ r, events, db }) {
  return (
    <section className="card flush">
      <div className="table-wrap">
        <table className="t" style={{ minWidth: 600 }}>
          <thead><tr><th>#</th><th>Event</th><th>Progression</th><th>Entries</th><th>First race</th></tr></thead>
          <tbody>
            {events.map((e) => {
              const n = fieldCount(db, r.id, e.id);
              return (
                <tr key={e.id}>
                  <td className="muted num">{e.num}</td>
                  <td className="bold">{e.name}</td>
                  <td className="muted">{e.progression}</td>
                  <td><span className="hstack" style={{ gap: 8, flexWrap: 'nowrap' }}><Bar value={n} max={e.cap} /><span className="small" style={{ color: n >= e.cap ? 'var(--orange-ink)' : 'var(--muted)' }}>{n >= e.cap ? 'Full' : `${n} of ${e.cap}`}</span></span></td>
                  <td className="num">{fmtDay(dayOfEvent(r, e)).split(',')[0]} {fmtTime(e.time)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PublicSchedule({ r, db }) {
  if (!r.drawPublished) return <section className="card"><Empty title="Schedule not posted yet">The host posts lanes and race times after entries close.</Empty></section>;
  const rows = entriesFor(db, r.id).filter((e) => e.status === 'submitted' || e.clubId === db.myClubId)
    .map((e) => ({ e, ev: getEvent(r, e.eventId), club: getClub(db, e.clubId), s: raceSlot(db, r, e) }))
    .sort((a, b) => a.ev.day - b.ev.day || a.s.time - b.s.time || a.s.lane - b.s.lane);
  return (
    <section className="card flush">
      {r.delayMin > 0 && <div className="callout warn" style={{ borderRadius: 0 }}>Running {r.delayMin} min behind. Times below are adjusted.</div>}
      <div className="table-wrap">
        <table className="t" style={{ minWidth: 560 }}>
          <thead><tr><th>Time</th><th>Event</th><th>Club</th><th>{r.format === 'Sprint' ? 'Lane' : 'Start #'}</th><th>Launch</th></tr></thead>
          <tbody>
            {rows.map(({ e, ev, club, s }) => (
              <tr key={e.id} style={{ background: e.clubId === db.myClubId ? '#FAFBFF' : undefined }}>
                <td className="num bold">{ev.day === 2 ? `${fmtDay(r.endDate).split(',')[0]} ` : ''}{fmtTime(s.time)}</td>
                <td>{ev.name}{s.heats > 1 ? ` · heat ${s.heat}` : ''}</td>
                <td>{club?.short} {e.crew}{e.clubId === db.myClubId && <span className="pill blue" style={{ marginLeft: 6 }}>You</span>}</td>
                <td className="num">{s.lane}</td>
                <td className="num">{fmtTime(launchTime(s.time))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
