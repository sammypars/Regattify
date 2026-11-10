import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore, getRegatta, entriesFor, getEvent, clubAthletes, raceSlot, myClub } from '../store';
import { fmtTime, fmtDay, launchTime, plural, todayIso } from '../lib';
import { Empty, Search, useToast, Icon } from '../components/ui';
import { nextRaceRegatta } from './Home';

export default function Schedule() {
  const { regattaId } = useParams();
  const nav = useNavigate();
  const { db } = useStore();
  const club = myClub(db);
  const withEntries = db.regattas.filter((r) => entriesFor(db, r.id, club.id).length).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const r = getRegatta(db, regattaId) || nextRaceRegatta(db) || withEntries[0];
  const [day, setDay] = useState(1);
  const [view, setView] = useState('time');
  const [q, setQ] = useState('');
  const [, toast, toastEl] = useToast();
  if (!r) return <main className="page narrow"><h1>Schedule</h1><div className="card"><Empty title="Nothing scheduled">Enter a regatta and your races show up here. <Link to="/regattas">Find a regatta</Link></Empty></div></main>;

  const athletes = Object.fromEntries(clubAthletes(db, club.id).map((a) => [a.id, a]));
  const multiDay = r.endDate !== r.startDate;
  const rows = entriesFor(db, r.id, club.id).map((e) => {
    const ev = getEvent(r, e.eventId);
    return { e, ev, s: raceSlot(db, r, e), names: e.seats.filter(Boolean).map((id) => athletes[id]?.name).filter(Boolean) };
  });
  const dayRows = rows.filter((x) => x.ev.day === day).sort((a, b) => a.s.time - b.s.time);
  const filtered = q ? dayRows.filter((x) => x.names.some((n) => n.toLowerCase().includes(q.toLowerCase()))) : dayRows;

  // Tight turnarounds on this day
  const notes = {};
  const byAthlete = {};
  dayRows.forEach((x) => x.e.seats.forEach((a) => { if (a) (byAthlete[a] ||= []).push(x); }));
  Object.entries(byAthlete).forEach(([aid, list]) => {
    for (let i = 1; i < list.length; i++) {
      const gap = list[i].s.time - list[i - 1].s.time;
      if (gap < r.turnaround + 15) (notes[list[i].e.id] ||= []).push(`${athletes[aid]?.name}: ${gap} min after the ${list[i - 1].ev.name}`);
    }
  });
  const tight = Object.values(notes).flat().length;

  const shareUrl = `${location.origin}${location.pathname}#/r/${r.id}`;
  const copy = async () => { try { await navigator.clipboard.writeText(shareUrl); toast('Link copied. Anyone with it can see the schedule.'); } catch { toast(shareUrl); } };
  const downloadIcs = () => {
    const date = (iso) => iso.replaceAll('-', '');
    const t = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}00`;
    const evs = rows.map((x) => `BEGIN:VEVENT\nUID:${x.e.id}@regattify\nDTSTART:${date(x.ev.day === 2 ? r.endDate : r.startDate)}T${t(x.s.baseTime)}\nDURATION:PT15M\nSUMMARY:${x.ev.name} ${x.e.crew} (${r.name})\nLOCATION:${r.venue}\nEND:VEVENT`).join('\n');
    const blob = new Blob([`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Regattify//EN\n${evs}\nEND:VCALENDAR`], { type: 'text/calendar' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${r.name}.ics`; a.click();
  };

  const isToday = r.startDate <= todayIso() && r.endDate >= todayIso();

  return (
    <main className="page">
      {toastEl}
      {r.delayMin > 0 && <div className="callout warn" role="status" style={{ fontWeight: 600 }}><span className="dot" style={{ background: 'var(--orange)', marginTop: 6 }} />Live from the regatta: racing is running {r.delayMin} minutes behind. Times below are already adjusted.</div>}
      <div className="head">
        <div>
          <Link to={`/r/${r.id}`} className="eyebrow">{r.name}</Link>
          <h1 style={{ marginTop: 2 }}>Our race day</h1>
        </div>
        <div className="hstack">
          {withEntries.length > 1 && (
            <label><span className="sr">Regatta</span>
              <select className="select" style={{ width: 'auto' }} value={r.id} onChange={(e) => { setDay(1); nav(`/schedule/${e.target.value}`); }}>
                {withEntries.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
          )}
          <button className="btn hide-phone" onClick={() => window.print()}>Print</button>
          <button className="btn primary" onClick={copy}><Icon name="share" size={16} />Share link</button>
        </div>
      </div>

      {!r.drawPublished && <div className="callout info"><Icon name="info" />Lanes and exact times come out when the host posts the draw. Times below are each event’s first race.</div>}

      <div className="hstack">
        {multiDay && (
          <div className="seg" role="tablist" aria-label="Day">
            {[1, 2].map((d) => <button key={d} role="tab" aria-selected={day === d} className={day === d ? 'on' : ''} onClick={() => setDay(d)}>{fmtDay(d === 1 ? r.startDate : r.endDate).split(',')[0]} · {rows.filter((x) => x.ev.day === d).length}</button>)}
          </div>
        )}
        <div className="seg" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === 'time'} className={view === 'time' ? 'on' : ''} onClick={() => setView('time')}>By time</button>
          <button role="tab" aria-selected={view === 'athlete'} className={view === 'athlete' ? 'on' : ''} onClick={() => setView('athlete')}>By athlete</button>
        </div>
        <div className="grow" style={{ flexBasis: 220, maxWidth: 340 }}><Search value={q} onChange={setQ} placeholder="Show one athlete’s races" /></div>
      </div>

      <div className="row">
        <section className="main-col" aria-label="Races">
          {filtered.length === 0 && <div className="card empty">No races {q ? 'for that athlete ' : ''}on this day.</div>}
          {view === 'time' && filtered.map(({ e, ev, s, names }) => (
            <article key={e.id} className="card tight hstack" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'nowrap' }}>
              <div style={{ width: 76, flex: '0 0 76px' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 700, lineHeight: 1.1 }} className="num">{fmtTime(s.time)}</div>
                {r.delayMin > 0 && <div className="tiny muted" style={{ textDecoration: 'line-through' }}>{fmtTime(s.baseTime)}</div>}
                <div className="small muted">Race {ev.num}</div>
              </div>
              <div className="grow stack-sm">
                <div className="bold" style={{ fontSize: 16 }}>{ev.name} · {e.crew}{s.heats > 1 ? <span className="muted" style={{ fontWeight: 500 }}> · heat {s.heat}</span> : null}</div>
                <div className="hstack small" style={{ gap: 16, color: 'var(--ink-2)' }}>
                  <span><span className="muted">{r.format === 'Sprint' ? 'Lane' : 'Start'}</span> <strong>{r.drawPublished ? s.lane : '—'}</strong></span>
                  <span><span className="muted">Hands on boat</span> <strong>{fmtTime(launchTime(s.time) - 15)}</strong></span>
                  <span><span className="muted">Launch</span> <strong>{fmtTime(launchTime(s.time))}</strong></span>
                </div>
                <div className="small muted">{names.length ? names.join(', ') : 'Lineup not set yet'}</div>
                {(notes[e.id] || []).map((n, i) => <div key={i} className="small bold" style={{ color: 'var(--orange-ink)', background: 'var(--orange-soft)', padding: '6px 10px', borderRadius: 8 }}>{n}</div>)}
              </div>
              <Link to={`/lineups/${r.id}?entry=${e.id}`} className="btn sm hide-phone">{names.length ? 'Lineup' : 'Set lineup'}</Link>
            </article>
          ))}
          {view === 'athlete' && (
            <section className="card flush">
              {Object.entries(byAthlete).map(([aid, list]) => ({ a: athletes[aid], list })).filter((x) => x.a && (!q || x.a.name.toLowerCase().includes(q.toLowerCase())))
                .sort((x, y) => x.a.name.localeCompare(y.a.name)).map(({ a, list }) => (
                  <div key={a.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <span className="bold" style={{ width: 160, flex: '0 0 160px' }}>{a.name}</span>
                    <span className="grow small">{list.map((x) => `${fmtTime(x.s.time)} ${x.ev.name} ${x.e.crew}`).join(' · ')}</span>
                  </div>
                ))}
            </section>
          )}
        </section>
        <aside className="side-col">
          <section className="card">
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>{isToday ? 'Today' : fmtDay(day === 1 ? r.startDate : r.endDate)} at a glance</h2>
            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
              <div className="stat center" style={{ padding: 10 }}><div className="v" style={{ fontSize: 22 }}>{dayRows.length}</div><div className="tiny muted">Races</div></div>
              <div className="stat center" style={{ padding: 10 }}><div className="v" style={{ fontSize: 22 }}>{Object.keys(byAthlete).length}</div><div className="tiny muted">Athletes</div></div>
              <div className="stat center" style={{ padding: 10, background: tight ? 'var(--orange-soft)' : undefined }}><div className="v" style={{ fontSize: 22, color: tight ? 'var(--orange-ink)' : undefined }}>{tight}</div><div className="tiny" style={{ color: tight ? 'var(--orange-ink)' : 'var(--muted)' }}>Tight gaps</div></div>
            </div>
          </section>
          <section className="card stack">
            <h2 style={{ fontSize: 18 }}>Share it</h2>
            <p className="small" style={{ color: 'var(--ink-2)' }}>Anyone with the link sees the regatta schedule, updated live. No login needed.</p>
            <button className="btn" onClick={downloadIcs}>Add {plural(rows.length, 'race')} to my calendar</button>
          </section>
          <section className="card stack small" style={{ color: 'var(--ink-2)' }}>
            <h2 style={{ fontSize: 18, color: 'var(--ink)' }}>Venue</h2>
            <p><strong>Trailers:</strong> {r.parking || 'Posted closer to race day'}</p>
            <p><strong>Docks:</strong> {r.docks || 'Posted closer to race day'}</p>
            {r.notes && <p><strong>Traffic:</strong> {r.notes}</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
