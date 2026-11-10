import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore, getRegatta, entriesFor, entryInfo, getEvent, clubAthletes, turnaroundIssues, logActivity, myClub } from '../store';
import { seatLabel, isCoxSeat, fmtTime, fmtRange, uid, initials, BOATS, dayOfEvent, fmtDay } from '../lib';
import { Empty, Search, Icon, useToast } from '../components/ui';
import { nextRaceRegatta } from './Home';

export default function Lineups() {
  const { regattaId } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const { db, update } = useStore();
  const club = myClub(db);
  const withEntries = db.regattas.filter((r) => entriesFor(db, r.id, club.id).length).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const r = getRegatta(db, regattaId) || nextRaceRegatta(db) || withEntries[0];
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const [pickSeat, setPickSeat] = useState(null);
  const [newName, setNewName] = useState('');
  const [newCox, setNewCox] = useState(false);
  const [, toast, toastEl] = useToast();

  const mine = useMemo(() => r ? entriesFor(db, r.id, club.id).slice().sort((a, b) => {
    const ea = getEvent(r, a.eventId), eb = getEvent(r, b.eventId);
    return ea.day - eb.day || ea.time - eb.time || a.crew.localeCompare(b.crew);
  }) : [], [db, r, club.id]);
  const entry = mine.find((e) => e.id === params.get('entry')) || mine[0];
  useEffect(() => { setSel(null); setPickSeat(null); }, [entry?.id]);

  if (!r || !entry) {
    return <main className="page narrow"><h1>Lineups</h1><div className="card"><Empty title="No crews yet">Enter a regatta first, then fill in names here. <Link to="/regattas">Find a regatta</Link></Empty></div></main>;
  }

  const ev = getEvent(r, entry.eventId);
  const boat = BOATS[ev.boat];
  const athletes = clubAthletes(db, club.id);
  const byId = Object.fromEntries(athletes.map((a) => [a.id, a]));

  // Where else each athlete races in this regatta.
  const elsewhere = {};
  for (const e of mine) {
    if (e.id === entry.id) continue;
    const ev2 = getEvent(r, e.eventId);
    e.seats.forEach((a) => { if (a) (elsewhere[a] ||= []).push({ e, ev: ev2 }); });
  }
  const conflictText = (aid) => {
    const list = (elsewhere[aid] || []).filter((x) => x.ev.day === ev.day);
    const same = list.find((x) => x.ev.time === ev.time);
    if (same) return { level: 'block', text: `Already in ${same.ev.name} ${same.e.crew}, same race` };
    const close = list.map((x) => ({ ...x, gap: Math.abs(x.ev.time - ev.time) })).sort((a, b) => a.gap - b.gap)[0];
    if (close && close.gap < r.turnaround + 15) return { level: 'warn', text: `${close.gap} min from ${close.ev.name} ${close.e.crew}` };
    if (close) return { level: 'ok', text: `Also in ${close.ev.name} at ${fmtTime(close.ev.time)}` };
    return null;
  };

  const setSeats = (seats, msg) => update((d) => {
    const en = d.entries.find((x) => x.id === entry.id); en.seats = seats;
    if (msg) logActivity(d, r.id, msg);
  });

  const tapSeat = (i) => {
    const seats = entry.seats.slice();
    if (!sel) {
      if (seats[i]) setSel(seats[i]); else { setPickSeat(i); setQ(''); }
      return;
    }
    const prev = seats.indexOf(sel), occupant = seats[i];
    if (prev === i) seats[i] = null;
    else { seats[i] = sel; if (prev >= 0) seats[prev] = occupant || null; }
    setSeats(seats); setSel(null);
  };
  const placeInSeat = (aid, i) => {
    const seats = entry.seats.slice();
    const prev = seats.indexOf(aid); if (prev >= 0) seats[prev] = null;
    seats[i] = aid; setSeats(seats); setPickSeat(null); setQ('');
  };
  const addAthlete = (name, cox, seatIndex) => {
    const nm = name.trim(); if (!nm) return;
    const id = uid('a');
    update((d) => {
      d.athletes.push({ id, clubId: club.id, name: nm, cox });
      if (seatIndex != null) { const en = d.entries.find((x) => x.id === entry.id); const p = en.seats.indexOf(id); if (p >= 0) en.seats[p] = null; en.seats[seatIndex] = id; }
    });
    setNewName(''); setNewCox(false); setPickSeat(null); setQ('');
    toast(`${nm} added`);
  };

  // Checks for this crew
  const checks = [];
  entry.seats.forEach((aid, i) => {
    if (!aid) return; const a = byId[aid]; if (!a) return;
    if (isCoxSeat(ev.boat, i) && !a.cox) checks.push({ tone: 'warn', text: `${a.name} is in the coxswain seat but isn’t a coxswain.` });
    if (!isCoxSeat(ev.boat, i) && a.cox) checks.push({ tone: 'warn', text: `${a.name} is a coxswain, placed in a rowing seat.` });
    const c = conflictText(aid);
    if (c?.level === 'block') checks.push({ tone: 'warn', text: `${a.name}: ${c.text.toLowerCase()}.` });
    if (c?.level === 'warn') checks.push({ tone: 'warn', text: `${a.name} has only ${c.text}.` });
  });
  const info = entryInfo(db, entry);
  const allIssues = turnaroundIssues(db, r.id, club.id, r.turnaround + 15);

  const rosterList = athletes
    .filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()))
    .map((a) => ({ a, c: conflictText(a.id), inBoat: entry.seats.includes(a.id) }))
    .sort((x, y) => (x.inBoat - y.inBoat) || ((x.c?.level === 'block') - (y.c?.level === 'block')) || x.a.name.localeCompare(y.a.name));
  const pickList = pickSeat == null ? [] : rosterList
    .filter((x) => !x.inBoat)
    .sort((x, y) => (isCoxSeat(ev.boat, pickSeat) ? (y.a.cox - x.a.cox) : (x.a.cox - y.a.cox)) || (!!x.c - !!y.c));

  return (
    <main className="page">
      {toastEl}
      <div className="head">
        <div>
          <p className="eyebrow">{r.name} · {fmtRange(r.startDate, r.endDate)}</p>
          <h1 style={{ marginTop: 2 }}>Lineups</h1>
        </div>
        <div className="hstack">
          {withEntries.length > 1 && (
            <label className="hstack small bold"><span className="sr">Regatta</span>
              <select className="select" style={{ width: 'auto' }} value={r.id} onChange={(e) => nav(`/lineups/${e.target.value}`)}>
                {withEntries.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
          )}
          <span className="okmsg hstack" style={{ gap: 6 }}><Icon name="check" size={16} />Saved automatically</span>
        </div>
      </div>

      <div className="hstack" role="tablist" aria-label="Your crews" style={{ overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 4 }}>
        {mine.map((e) => {
          const ei = entryInfo(db, e); const on = e.id === entry.id;
          return (
            <button key={e.id} role="tab" aria-selected={on} className={`crewtab${on ? ' on' : ''}`} onClick={() => setParams({ entry: e.id })}>
              <span className="bold small" style={{ whiteSpace: 'nowrap' }}>{ei.event.name} · {e.crew}</span>
              <span className="tiny" style={{ color: ei.full ? 'var(--green)' : 'var(--orange-ink)', whiteSpace: 'nowrap' }}>{fmtTime(ei.event.time)} · {ei.filled}/{ei.total} seats</span>
            </button>
          );
        })}
      </div>

      <div className="row">
        <section className="side-col card hide-phone" aria-labelledby="roster-h" style={{ gap: 10 }}>
          <div className="spread"><h2 id="roster-h" style={{ fontSize: 18 }}>Athletes</h2><span className="small muted">{athletes.length}</span></div>
          <Search value={q} onChange={setQ} placeholder="Find an athlete" />
          <div className="stack-sm" style={{ maxHeight: 560, overflowY: 'auto' }}>
            {rosterList.map(({ a, c, inBoat }) => {
              const isSel = sel === a.id;
              return (
                <button key={a.id} className={`person${isSel ? ' sel' : inBoat ? ' in' : ''}`} aria-pressed={isSel} onClick={() => setSel(isSel ? null : a.id)}>
                  <span className={`av${a.cox ? ' cox' : ''}`}>{initials(a.name)}</span>
                  <span className="grow"><span className="bold small" style={{ display: 'block' }}>{a.name}</span>
                    <span className="tiny muted">{a.cox ? 'Coxswain' : 'Rower'}{c ? ` · ${c.text}` : ''}</span></span>
                  {inBoat && <span className="pill blue">In boat</span>}
                </button>
              );
            })}
          </div>
          <form className="stack-sm" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }} onSubmit={(e) => { e.preventDefault(); addAthlete(newName, newCox); }}>
            <label className="field">Add a name<input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="First and last name" /></label>
            <div className="spread"><label className="check"><input type="checkbox" checked={newCox} onChange={(e) => setNewCox(e.target.checked)} />Coxswain</label><button className="btn sm" disabled={!newName.trim()}>Add</button></div>
          </form>
        </section>

        <section className="main-col card" aria-labelledby="boat-h">
          <div className="spread" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 id="boat-h" style={{ fontSize: 22 }}>{ev.name} · {entry.crew}</h2>
              <div className="small muted">Race {ev.num} · {fmtDay(dayOfEvent(r, ev))} {fmtTime(ev.time)}</div>
            </div>
            <span className={`pill ${info.full && !checks.length ? 'green' : 'orange'}`}>{info.full ? (checks.length ? `Full · ${checks.length} to check` : 'Ready') : `${info.filled} of ${info.total} seats`}</span>
          </div>
          {sel ? (
            <div className="callout info" role="status" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="grow bold">Placing {byId[sel]?.name}. Tap a seat.</span>
              {entry.seats.includes(sel) && <button className="btn sm" onClick={() => { const s = entry.seats.slice(); s[s.indexOf(sel)] = null; setSeats(s); setSel(null); }}>Remove from boat</button>}
              <button className="btn sm ghost" onClick={() => setSel(null)}>Cancel</button>
            </div>
          ) : <p className="small muted">Tap an empty seat to pick a name. Tap someone seated to move or swap them.</p>}
          <div className="spread tiny bold muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px' }}><span>Stern</span></div>
          <div className="shell">
            {entry.seats.map((aid, i) => {
              const a = aid ? byId[aid] : null;
              const isSel = aid && aid === sel;
              const c = aid ? conflictText(aid) : null;
              const bad = a && ((isCoxSeat(ev.boat, i) !== !!a.cox) || c?.level === 'block' || c?.level === 'warn');
              return (
                <button key={i} className={`seat${a ? '' : ' empty'}${isSel ? ' sel' : ''}${sel && !isSel ? ' target' : ''}`} onClick={() => tapSeat(i)} aria-label={`${seatLabel(ev.boat, i)}: ${a ? a.name : 'empty'}`}>
                  <span className="lbl">{seatLabel(ev.boat, i)}</span>
                  <span className="grow" style={{ fontWeight: a ? 600 : 500 }}>{a ? a.name : 'Empty seat'}</span>
                  {bad && <span className="pill orange">Check</span>}
                </button>
              );
            })}
          </div>
          <div className="center tiny bold muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bow</div>
        </section>

        <aside className="side-col">
          <section className="card stack">
            <h2 style={{ fontSize: 18 }}>Automatic checks</h2>
            {checks.length === 0 && info.full && <div className="callout good">All clear: coxswain and turnaround times.</div>}
            {checks.length === 0 && !info.full && <div className="callout gray">{info.total - info.filled} seat{info.total - info.filled === 1 ? '' : 's'} still empty. You can fill them until {r.lineupDeadlineHrs} hours before the race.</div>}
            {checks.map((c, i) => <div key={i} className="callout warn"><strong>Check</strong><span>{c.text}</span></div>)}
            {allIssues.length > 0 && <p className="small muted">{allIssues.length} tight turnaround{allIssues.length === 1 ? '' : 's'} across all your crews at this regatta.</p>}
          </section>
          <section className="card stack small" style={{ color: 'var(--ink-2)' }}>
            <h3>Good to know</h3>
            <p>Changes are allowed until {r.lineupDeadlineHrs} hours before the race. After that the regatta has to approve them.</p>
            <p>Names you add are remembered for next time. No athlete accounts needed.</p>
            <button className="btn sm danger" style={{ alignSelf: 'flex-start' }} onClick={() => { if (confirm('Empty every seat in this crew?')) setSeats(entry.seats.map(() => null)); }}>Clear this lineup</button>
          </section>
        </aside>
      </div>

      {pickSeat != null && (
        <div role="dialog" aria-modal="true" aria-labelledby="pick-h" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(14,23,38,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setPickSeat(null)}>
          <div className="stack" style={{ background: '#fff', width: '100%', maxWidth: 520, maxHeight: '80vh', borderRadius: '20px 20px 0 0', padding: '12px 16px 24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--field)', alignSelf: 'center' }} />
            <div className="spread">
              <h2 id="pick-h" style={{ fontSize: 18 }}>Pick for {seatLabel(ev.boat, pickSeat)}</h2>
              <button className="iconbtn" style={{ border: 0 }} aria-label="Close" onClick={() => setPickSeat(null)}><Icon name="x" /></button>
            </div>
            <Search value={q} onChange={setQ} placeholder="Search or type a new name" />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {q.trim() && !athletes.some((a) => a.name.toLowerCase() === q.trim().toLowerCase()) && (
                <button className="person" style={{ border: 0, borderBottom: '1px solid var(--line-2)', borderRadius: 0 }} onClick={() => addAthlete(q, isCoxSeat(ev.boat, pickSeat), pickSeat)}>
                  <span className="av"><Icon name="plus" size={16} /></span><span className="grow bold">Add “{q.trim()}”{isCoxSeat(ev.boat, pickSeat) ? ' as coxswain' : ''}</span>
                </button>
              )}
              {pickList.map(({ a, c }) => (
                <button key={a.id} className="person" style={{ border: 0, borderBottom: '1px solid var(--line-2)', borderRadius: 0, opacity: c?.level === 'block' ? 0.6 : 1 }} onClick={() => placeInSeat(a.id, pickSeat)}>
                  <span className={`av${a.cox ? ' cox' : ''}`}>{initials(a.name)}</span>
                  <span className="grow"><span className="bold" style={{ display: 'block' }}>{a.name}</span>
                    <span className="small" style={{ color: c && c.level !== 'ok' ? 'var(--orange-ink)' : 'var(--muted)' }}>{c ? c.text : 'Free at this time'}{a.cox ? ' · coxswain' : ''}</span></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
