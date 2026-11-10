import { Link } from 'react-router-dom';
import { useStore, myClub, entriesFor, entryInfo, getClub, turnaroundIssues, isAdmin, getEvent, raceSlot } from '../store';
import { fmtDay, fmtRange, monShort, dayNum, untilText, daysUntil, todayIso, fmtTime, plural } from '../lib';
import { Icon } from '../components/ui';

export function upcomingForClub(db) {
  const today = todayIso();
  return db.regattas
    .filter((r) => r.endDate >= today && (entriesFor(db, r.id, db.myClubId).length || r.hostClubId === db.myClubId))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function nextRaceRegatta(db) {
  return upcomingForClub(db).find((r) => entriesFor(db, r.id, db.myClubId).length);
}

export default function Home() {
  const { db } = useStore();
  const club = myClub(db);
  const season = upcomingForClub(db);
  const next = nextRaceRegatta(db);
  const first = db.session.name.split(' ')[0];

  const todos = [];
  for (const r of season) {
    const mine = entriesFor(db, r.id, club.id);
    const drafts = mine.filter((e) => e.status === 'draft');
    const notFull = mine.filter((e) => !entryInfo(db, e).full).length;
    if (drafts.length && daysUntil(r.entriesClose) >= 0) {
      todos.push({ tone: daysUntil(r.entriesClose) <= 3 ? 'warn' : 'info', mark: daysUntil(r.entriesClose) <= 0 ? '!' : `${daysUntil(r.entriesClose)}d`,
        title: `${r.name}: entries close ${untilText(r.entriesClose)}`,
        detail: `${plural(drafts.length, 'crew')} not submitted yet${notFull ? ` · ${notFull} lineup${notFull === 1 ? '' : 's'} not full (that can wait until race day)` : ''}`,
        cta: 'Finish entries', to: `/r/${r.id}/enter` });
    }
    const issues = turnaroundIssues(db, r.id, club.id, r.turnaround + 15);
    if (issues.length) {
      const a = db.athletes.find((x) => x.id === issues[0].athleteId);
      todos.push({ tone: 'warn', mark: '!', title: `${r.name}: ${issues.length === 1 ? `${a?.name} has` : `${issues.length} athletes have`} a tight turnaround`,
        detail: issues[0].same ? `${a?.name} is in two crews in the same race.` : `${a?.name} has only ${issues[0].gap} min between races.`, cta: 'Review lineups', to: `/lineups/${r.id}` });
    }
    if (r.drawPublished && mine.some((e) => e.status === 'submitted') && daysUntil(r.startDate) <= 14) {
      todos.push({ tone: 'info', mark: 'New', title: `Start times are posted for ${r.name}`, detail: 'Check lanes and launch times, then share the schedule.', cta: 'See schedule', to: `/schedule/${r.id}` });
    }
  }

  const nextRaces = next ? entriesFor(db, next.id, club.id).map((e) => ({ e, ev: getEvent(next, e.eventId), s: raceSlot(db, next, e) }))
    .filter((x) => x.ev.day === 1).sort((a, b) => a.s.time - b.s.time) : [];

  return (
    <main className="page">
      <div className="head">
        <div>
          <p className="eyebrow">{fmtDay(todayIso())}</p>
          <h1>Hi {first}</h1>
        </div>
        <div className="hstack">
          <Link to="/lineups" className="btn hide-phone">Build a lineup</Link>
          <Link to="/regattas" className="btn primary"><Icon name="plus" size={16} />Enter a regatta</Link>
        </div>
      </div>

      {todos.length > 0 && (
        <section className="card" aria-labelledby="todo-h">
          <div className="spread" style={{ marginBottom: 4 }}>
            <h2 id="todo-h">Needs your attention</h2>
            <span className="small muted">{plural(todos.length, 'item')}</span>
          </div>
          {todos.slice(0, 5).map((t, i) => (
            <div className="list-row" key={i} style={{ flexWrap: 'wrap' }}>
              <span className="badge" style={{ width: 40, height: 40, flexBasis: 40, borderRadius: 10, background: t.tone === 'warn' ? 'var(--orange-soft)' : 'var(--blue-soft)', color: t.tone === 'warn' ? 'var(--orange)' : 'var(--blue)', fontSize: 13 }}>{t.mark}</span>
              <div className="grow" style={{ flexBasis: 260 }}>
                <div className="bold">{t.title}</div>
                <div className="small muted">{t.detail}</div>
              </div>
              <Link to={t.to} className="btn soft">{t.cta}</Link>
            </div>
          ))}
        </section>
      )}

      <div className="row">
        <section className="main-col" aria-labelledby="season-h">
          <div className="spread"><h2 id="season-h">Your season</h2><Link to="/regattas" className="bold" style={{ textDecoration: 'none' }}>Find regattas</Link></div>
          {season.length === 0 && <div className="card"><p className="muted">No regattas yet. <Link to="/regattas">Find one to enter.</Link></p></div>}
          {season.map((r) => {
            const mine = entriesFor(db, r.id, club.id);
            const hosting = r.hostClubId === club.id;
            const drafts = mine.filter((e) => e.status === 'draft').length;
            const full = mine.filter((e) => entryInfo(db, e).full).length;
            const pill = hosting ? ['dark', 'You’re hosting'] : drafts ? ['orange', `${drafts} not submitted`] : ['green', `Entered · ${plural(mine.length, 'crew')}`];
            const to = hosting && !mine.length ? `/host/${r.id}` : drafts ? `/r/${r.id}/enter` : `/schedule/${r.id}`;
            return (
              <article key={r.id} className="card tight hstack" style={{ gap: 16, flexWrap: 'nowrap' }}>
                <div className="datetile"><div className="m">{monShort(r.startDate)}</div><div className="d">{dayNum(r.startDate)}</div></div>
                <div className="grow">
                  <div className="hstack" style={{ gap: 8 }}>
                    <Link to={`/r/${r.id}`} className="bold" style={{ color: 'var(--ink)', textDecoration: 'none', fontSize: 17 }}>{r.name}</Link>
                    <span className={`pill ${pill[0]}`}>{pill[1]}</span>
                  </div>
                  <div className="small muted">{r.venue} · hosted by {getClub(db, r.hostClubId)?.name}</div>
                  {mine.length > 0 && (
                    <div className="hstack" style={{ marginTop: 8 }}>
                      <div className="progress" style={{ width: 180 }}><i style={{ width: `${(full / mine.length) * 100}%` }} /></div>
                      <span className="small muted">{full} of {mine.length} lineups full</span>
                    </div>
                  )}
                </div>
                <Link to={to} className="btn hide-phone">{hosting && !mine.length ? 'Manage' : drafts ? 'Continue' : 'Schedule'}</Link>
                <Link to={to} className="show-phone" aria-label={`Open ${r.name}`}><Icon name="chev" color="#8792A2" /></Link>
              </article>
            );
          })}
        </section>

        <aside className="side-col">
          {next && (
            <section className="card dark stack" aria-labelledby="next-h">
              <h2 id="next-h" className="tiny" style={{ fontFamily: 'Inter', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue-mid)' }}>Next race day</h2>
              <div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700 }}>{fmtRange(next.startDate, next.endDate)}</div>
                <div className="small" style={{ color: '#C9D3E3' }}>{next.name} · {plural(entriesFor(db, next.id, club.id).length, 'crew')}</div>
              </div>
              {nextRaces.slice(0, 4).map(({ e, ev, s }) => (
                <div key={e.id} className="hstack" style={{ flexWrap: 'nowrap', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 10 }}>
                  <span className="bold num" style={{ width: 52 }}>{fmtTime(s.time)}</span>
                  <span className="grow small">{ev.name} · {e.crew}</span>
                </div>
              ))}
              <Link to={`/schedule/${next.id}`} className="btn" style={{ background: '#fff' }}>See our schedule</Link>
            </section>
          )}
          {isAdmin(db) && (
            <section className="card stack" aria-labelledby="host-h">
              <h2 id="host-h" style={{ fontSize: 18 }}>Hosting a regatta?</h2>
              <p className="small" style={{ color: 'var(--ink-2)' }}>Set one up in eight short steps. Nothing goes public until you publish.</p>
              <div className="hstack"><Link to="/host/new" className="btn">Host a regatta</Link><Link to="/host" className="btn ghost">Your hosted regattas</Link></div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
