import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore, getRegatta, myClub, entriesFor } from '../store';
import { BOAT_LIST, CATEGORIES, FEE_LABELS, fmtTime, parseTime, toInputTime, uid, progressionFor, fmtRange, money, entryFee } from '../lib';
import { Empty, useToast } from '../components/ui';
import { HostTabs } from './Organizer';

const PACKAGES = {
  'Youth sprint': [
    ["Youth Men's 8+", '8+'], ["Youth Women's 8+", '8+'], ["Youth Men's 4+", '4+'], ["Youth Women's 4+", '4+'],
    ["Youth Men's 4x", '4x'], ["Youth Women's 4x", '4x'], ["Youth Men's 2x", '2x'], ["Youth Women's 2x", '2x'],
    ["Youth Men's 1x", '1x'], ["Youth Women's 1x", '1x'],
  ].map(([n, b]) => [n, b, 'Youth']),
  Masters: [["Masters Men's 8+", '8+'], ["Masters Women's 8+", '8+'], ["Masters Men's 4x", '4x'], ["Masters Women's 4x", '4x'], ["Masters Men's 1x", '1x'], ["Masters Women's 1x", '1x']].map(([n, b]) => [n, b, 'Masters']),
  Adaptive: [['PR3 Mixed 4+', '4+'], ['PR3 Mixed 2x', '2x'], ['PR2 Mixed 2x', '2x'], ['PR1 1x', '1x']].map(([n, b]) => [n, b, 'Adaptive']),
};

export default function HostSetup() {
  const { id } = useParams();
  const { db, update } = useStore();
  const r = getRegatta(db, id);
  const [open, setOpen] = useState(r && !r.name ? 1 : 2);
  const [ne, setNe] = useState({ name: '', cat: 'Youth', boat: '8+', day: 1, cap: 18 });
  const [, toast, toastEl] = useToast();
  if (!r || r.hostClubId !== db.myClubId) return <main className="page"><Empty title="Regatta not found" /></main>;

  const set = (patch) => update((d) => Object.assign(d.regattas.find((x) => x.id === r.id), patch));
  const setFee = (k, v) => update((d) => { d.regattas.find((x) => x.id === r.id).fees[k] = Math.max(0, Number(v) || 0); });
  const multiDay = r.endDate !== r.startDate;

  const done = {
    1: !!(r.name.trim() && r.venue.trim() && r.startDate && r.endDate >= r.startDate),
    2: r.events.length > 0 && r.events.every((e) => entryFee(r, e) > 0),
    3: !!(r.entriesOpen && r.entriesClose && r.entriesOpen <= r.entriesClose && r.entriesClose <= r.startDate),
    4: !!r.payoutConnected,
    5: r.firstRace != null && r.interval > 0,
    6: true,
    7: !!(r.contact && (r.address || r.parking || r.docks)),
  };
  const required = [1, 2, 3, 4, 5, 7];
  const ready = required.every((k) => done[k]);
  const doneCount = Object.values(done).filter(Boolean).length + (r.status === 'open' ? 1 : 0);

  const sumOf = {
    1: r.name ? `${r.name} · ${fmtRange(r.startDate, r.endDate)} · ${r.venue || 'venue?'} · ${r.format}, ${r.course}` : 'Name, dates, venue and course',
    2: r.events.length ? `${r.events.length} events · fees ${Object.values(r.fees).some((f) => !f) ? 'not all set' : 'set'}` : 'Pick events from a package, then set fees',
    3: `Open ${r.entriesOpen} → close ${r.entriesClose} · lineups editable until ${r.lineupDeadlineHrs} hrs before`,
    4: r.payoutConnected ? `Payout account connected · fees paid by ${r.feePaidBy === 'club' ? 'entering clubs' : 'you'}` : 'Connect where entry fees get paid out',
    5: `${fmtTime(r.firstRace)} start · ${r.interval} min between races · ${r.turnaround} min turnaround`,
    6: 'Your club’s admins can run this regatta',
    7: done[7] ? `${r.venue} · contact ${r.contact}` : 'Address, docks, parking and a contact',
    8: r.status === 'open' ? 'Published: clubs can see it' : ready ? 'Ready to publish' : 'Finish the sections above first',
  };

  const addPackage = (name) => {
    update((d) => {
      const rg = d.regattas.find((x) => x.id === r.id);
      let num = rg.events.length;
      PACKAGES[name].forEach(([n, boat, cat]) => {
        if (rg.events.some((e) => e.name === n)) return;
        num++;
        rg.events.push({ id: uid('e'), num: String(num), name: n, cat, boat, day: 1, time: null, cap: 18, progression: progressionFor(18, rg.lanes) });
      });
      spaceTimes(rg);
    });
    toast(`${name} events added`);
  };
  const addEvent = (e) => {
    e.preventDefault();
    if (!ne.name.trim()) return;
    update((d) => {
      const rg = d.regattas.find((x) => x.id === r.id);
      rg.events.push({ id: uid('e'), num: String(rg.events.length + 1), name: ne.name.trim(), cat: ne.cat, boat: ne.boat, day: Number(ne.day), time: null, cap: Number(ne.cap) || 12, progression: progressionFor(Number(ne.cap) || 12, rg.lanes) });
      spaceTimes(rg);
    });
    setNe({ ...ne, name: '' });
  };
  const removeEvent = (ev) => {
    if (entriesFor(db, r.id).some((x) => x.eventId === ev.id)) { toast('Clubs have entered this event, so it can’t be removed.'); return; }
    update((d) => { const rg = d.regattas.find((x) => x.id === r.id); rg.events = rg.events.filter((x) => x.id !== ev.id); spaceTimes(rg); });
  };
  const editEvent = (ev, patch) => update((d) => {
    const e = d.regattas.find((x) => x.id === r.id).events.find((x) => x.id === ev.id);
    Object.assign(e, patch); if (patch.cap != null) e.progression = progressionFor(e.cap, r.lanes);
  });

  const Section = ({ n, title, children }) => {
    const isOpen = open === n;
    const status = n === 8 ? (r.status === 'open' ? 'done' : 'todo') : done[n] ? 'done' : 'todo';
    return (
      <section className={`acc${isOpen ? ' open' : ''}`}>
        <button className="acc-h" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? 0 : n)}>
          <span className={`stepdot${status === 'done' ? ' done' : isOpen ? ' cur' : ''}`}>{status === 'done' ? '✓' : n}</span>
          <span className="grow"><span className="bold" style={{ display: 'block', fontSize: 17 }}>{title}</span><span className="small muted">{sumOf[n]}</span></span>
          <span className={`pill ${status === 'done' ? 'green' : isOpen ? 'blue' : ''} hide-phone`}>{status === 'done' ? 'Done' : n === 6 ? 'Optional' : 'To do'}</span>
        </button>
        {isOpen && <div className="acc-b">{children}{n < 8 && <div className="hstack" style={{ justifyContent: 'flex-end' }}><button className="btn primary" onClick={() => setOpen(n + 1)}>Next</button></div>}</div>}
      </section>
    );
  };

  return (
    <main className="page">
      {toastEl}
      <div className="head">
        <div><p className="eyebrow">{myClub(db).name} · draft saves automatically</p><h1 style={{ marginTop: 2 }}>{r.name || 'Set up your regatta'}</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 680 }}>Eight short sections. Nothing is public until you publish, and you can change most settings after entries open.</p></div>
      </div>
      {r.name && <HostTabs r={r} active="setup" />}

      <div className="row">
        <div className="main-col" style={{ gap: 12 }}>
          {Section({ n: 1, title: 'Basics', children: (
            <div className="grid-2">
              <label className="field" style={{ gridColumn: '1 / -1' }}>Regatta name<input className="input" value={r.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Riverside Spring Sprints" /></label>
              <label className="field">First race day<input className="input" type="date" value={r.startDate} onChange={(e) => set({ startDate: e.target.value, endDate: r.endDate < e.target.value ? e.target.value : r.endDate })} /></label>
              <label className="field">Last race day<input className="input" type="date" min={r.startDate} value={r.endDate} onChange={(e) => set({ endDate: e.target.value })} /></label>
              <fieldset style={{ gridColumn: '1 / -1', border: 0, padding: 0, margin: 0 }}><legend className="field" style={{ marginBottom: 6 }}>Race format</legend>
                <div className="hstack">{['Sprint', 'Head race', 'Indoor'].map((f) => (
                  <label key={f} className={`radio-card${r.format === f ? ' on' : ''}`} style={{ minHeight: 44 }}><input type="radio" name="fmt" checked={r.format === f} onChange={() => set({ format: f, course: f === 'Head race' ? '5,000 m' : f === 'Indoor' ? '2,000 m (erg)' : '1,500 m' })} />{f === 'Sprint' ? 'Sprint (side by side)' : f === 'Head race' ? 'Head race (timed)' : 'Indoor / erg'}</label>))}</div>
              </fieldset>
              <label className="field">Course<input className="input" value={r.course} onChange={(e) => set({ course: e.target.value })} /></label>
              {r.format === 'Sprint' && <label className="field">Lanes<select className="select" value={r.lanes} onChange={(e) => set({ lanes: Number(e.target.value) })}>{[4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}</select></label>}
              <label className="field">Venue<input className="input" value={r.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="e.g. Harbor Lake" /></label>
            </div>) })}

          {Section({ n: 2, title: 'Events and fees', children: (
            <>
              <div><div className="field" style={{ marginBottom: 8 }}>Start from a package, then edit</div>
                <div className="chips">{Object.keys(PACKAGES).map((p) => <button key={p} className="chip" onClick={() => addPackage(p)}>+ {p} · {PACKAGES[p].length}</button>)}</div></div>
              {r.events.length > 0 && (
                <div className="card flush"><div className="table-wrap"><table className="t" style={{ minWidth: 640 }}>
                  <thead><tr><th>Event</th><th>Boat</th>{multiDay && <th>Day</th>}<th>Cap</th><th>Progression</th><th>First race</th><th><span className="sr">Remove</span></th></tr></thead>
                  <tbody>{r.events.slice().sort((a, b) => a.day - b.day || (a.time ?? 0) - (b.time ?? 0)).map((ev) => (
                    <tr key={ev.id}>
                      <td><input className="input" style={{ minHeight: 36 }} value={ev.name} aria-label="Event name" onChange={(e) => editEvent(ev, { name: e.target.value })} /></td>
                      <td>{ev.boat}</td>
                      {multiDay && <td><select className="select" style={{ minHeight: 36, width: 70 }} aria-label="Day" value={ev.day} onChange={(e) => update((d) => { const rg = d.regattas.find((x) => x.id === r.id); rg.events.find((x) => x.id === ev.id).day = Number(e.target.value); spaceTimes(rg); })}><option value={1}>1</option><option value={2}>2</option></select></td>}
                      <td><input className="input" type="number" min={1} style={{ minHeight: 36, width: 70 }} aria-label="Cap" value={ev.cap} onChange={(e) => editEvent(ev, { cap: Math.max(1, Number(e.target.value) || 1) })} /></td>
                      <td className="muted small">{ev.progression}</td>
                      <td className="num">{fmtTime(ev.time)}</td>
                      <td><button className="btn sm ghost" style={{ color: 'var(--orange-ink)' }} onClick={() => removeEvent(ev)}>Remove</button></td>
                    </tr>))}</tbody>
                </table></div></div>
              )}
              <form className="hstack" onSubmit={addEvent} style={{ alignItems: 'flex-end' }}>
                <label className="field grow" style={{ flexBasis: 200 }}>Add an event<input className="input" value={ne.name} onChange={(e) => setNe({ ...ne, name: e.target.value })} placeholder="e.g. Youth Women's 2-" /></label>
                <label className="field">Category<select className="select" value={ne.cat} onChange={(e) => setNe({ ...ne, cat: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
                <label className="field">Boat<select className="select" value={ne.boat} onChange={(e) => setNe({ ...ne, boat: e.target.value })}>{BOAT_LIST.map((b) => <option key={b}>{b}</option>)}</select></label>
                {multiDay && <label className="field">Day<select className="select" value={ne.day} onChange={(e) => setNe({ ...ne, day: e.target.value })}><option value={1}>1</option><option value={2}>2</option></select></label>}
                <label className="field">Cap<input className="input" type="number" min={1} style={{ width: 80 }} value={ne.cap} onChange={(e) => setNe({ ...ne, cap: e.target.value })} /></label>
                <button className="btn" disabled={!ne.name.trim()}>Add</button>
              </form>
              <div className="stack" style={{ background: 'var(--bg)', borderRadius: 12, padding: 14 }}>
                <div className="field">Fee per entry</div>
                <div className="grid-4">{Object.entries(FEE_LABELS).map(([k, label]) => (
                  <label key={k} className="field" style={{ fontSize: 13 }}>{label}<input className="input" type="number" min={0} inputMode="decimal" value={r.fees[k] || ''} placeholder="$" onChange={(e) => setFee(k, e.target.value)} /></label>))}</div>
              </div>
            </>) })}

          {Section({ n: 3, title: 'Entry rules', children: (
            <div className="grid-2">
              <label className="field">Entries open<input className="input" type="date" value={r.entriesOpen} onChange={(e) => set({ entriesOpen: e.target.value })} /></label>
              <label className="field">Entries close<input className="input" type="date" max={r.startDate} value={r.entriesClose} onChange={(e) => set({ entriesClose: e.target.value })} /></label>
              <label className="field">Late entries<select className="select" value={r.lateEntries} onChange={(e) => set({ lateEntries: e.target.value })}><option value="no">Not accepted</option><option value="approve">Accepted with my approval</option></select></label>
              <label className="field">Lineup changes allowed until<select className="select" value={r.lineupDeadlineHrs} onChange={(e) => set({ lineupDeadlineHrs: Number(e.target.value) })}>{[1, 2, 4, 24].map((h) => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''} before the race</option>)}</select></label>
              <label className="field">Max crews per club per event<select className="select" value={r.maxCrews} onChange={(e) => set({ maxCrews: Number(e.target.value) })}>{[1, 2, 3, 4, 6, 99].map((n) => <option key={n} value={n}>{n === 99 ? 'No limit' : n}</option>)}</select></label>
              <label className="field">Scratch refunds<select className="select" value={r.refundPolicy} onChange={(e) => set({ refundPolicy: e.target.value })}>{['Full refund before the draw', '50% refund before race week', 'No refunds'].map((p) => <option key={p}>{p}</option>)}</select></label>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="check"><input type="checkbox" checked={r.waiver} onChange={(e) => set({ waiver: e.target.checked })} />Clubs confirm their athletes signed the regatta waiver</label>
                <label className="check"><input type="checkbox" checked={r.memberships} onChange={(e) => set({ memberships: e.target.checked })} />Clubs confirm athlete memberships are current</label>
                <label className="check"><input type="checkbox" checked={r.composite} onChange={(e) => set({ composite: e.target.checked })} />Allow composite crews (more than one club)</label>
              </div>
              {!done[3] && <p className="error" style={{ gridColumn: '1 / -1' }}>Entries must open before they close, and close on or before the first race day.</p>}
            </div>) })}

          {Section({ n: 4, title: 'Payments', children: (
            <>
              <div className="callout gray" style={{ alignItems: 'center', flexWrap: 'wrap', border: '1px dashed #AEB8C6', background: '#fff' }}>
                <div className="grow" style={{ flexBasis: 260 }}><div className="bold" style={{ color: 'var(--ink)' }}>{r.payoutConnected ? 'Payout account connected' : 'Connect a payout account'}</div>
                  <div className="small muted">Entry fees go straight to your club’s bank. You sign in with the payment provider; Regattify never sees your bank details.</div></div>
                <button className={`btn ${r.payoutConnected ? '' : 'dark'}`} onClick={() => { set({ payoutConnected: !r.payoutConnected }); toast(r.payoutConnected ? 'Disconnected' : 'Connected (demo)'); }}>{r.payoutConnected ? 'Disconnect' : 'Connect account'}</button>
              </div>
              <label className="field" style={{ maxWidth: 420 }}>Card and Regattify fees paid by<select className="select" value={r.feePaidBy} onChange={(e) => set({ feePaidBy: e.target.value })}><option value="club">Entering club (added at checkout)</option><option value="host">Us (taken from payouts)</option></select></label>
              <Link to={`/host/${r.id}/payouts`} className="small bold" style={{ textDecoration: 'none' }}>How the money moves</Link>
            </>) })}

          {Section({ n: 5, title: 'Schedule and racing', children: (
            <>
              <div className="grid-2">
                <label className="field">First race each day<input className="input" type="time" value={toInputTime(r.firstRace)} onChange={(e) => update((d) => { const rg = d.regattas.find((x) => x.id === r.id); rg.firstRace = parseTime(e.target.value); spaceTimes(rg); })} /></label>
                <label className="field">Racing must end by<input className="input" type="time" value={toInputTime(r.lastRace)} onChange={(e) => set({ lastRace: parseTime(e.target.value) })} /></label>
                <label className="field">Time between races<select className="select" value={r.interval} onChange={(e) => update((d) => { const rg = d.regattas.find((x) => x.id === r.id); rg.interval = Number(e.target.value); spaceTimes(rg); })}>{[5, 6, 7, 8, 10].map((n) => <option key={n} value={n}>{n} min</option>)}</select></label>
                <label className="field">Shortest athlete turnaround<select className="select" value={r.turnaround} onChange={(e) => set({ turnaround: Number(e.target.value) })}>{[30, 45, 60].map((n) => <option key={n} value={n}>{n} min (warn below)</option>)}</select></label>
              </div>
              {r.events.length > 0 && (() => { const last = Math.max(...r.events.map((e) => (e.time ?? 0) + (Math.ceil(e.cap / r.lanes) - 1) * r.interval)); return <p className={last > r.lastRace ? 'error' : 'hint'}>With full fields, the last race starts at about {fmtTime(last)}{last > r.lastRace ? ' — later than your end time. Lower some caps or start earlier.' : '.'}</p>; })()}
            </>) })}

          {Section({ n: 6, title: 'People', children: (
            <>
              <p className="small" style={{ color: 'var(--ink-2)' }}>Anyone who is an admin at {myClub(db).name} can run this regatta: approve changes, post the draw and results.</p>
              <div className="chips">{myClub(db).members.filter((m) => m.role === 'Admin').map((m) => <span key={m.email} className="pill blue">{m.name || m.email}</span>)}</div>
              <Link to="/club" className="small bold" style={{ textDecoration: 'none' }}>Add or change admins in Club settings</Link>
            </>) })}

          {Section({ n: 7, title: 'Venue and contact', children: (
            <div className="grid-2">
              <label className="field" style={{ gridColumn: '1 / -1' }}>Address<input className="input" value={r.address} onChange={(e) => set({ address: e.target.value })} /></label>
              <label className="field">Trailer parking<input className="input" value={r.parking} onChange={(e) => set({ parking: e.target.value })} placeholder="e.g. Lot B, assigned by club" /></label>
              <label className="field">Launch and landing docks<input className="input" value={r.docks} onChange={(e) => set({ docks: e.target.value })} placeholder="e.g. Launch North dock, land South" /></label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>Traffic pattern and safety notes<textarea className="textarea" value={r.notes} onChange={(e) => set({ notes: e.target.value })} /></label>
              <label className="field">Contact email for clubs<input className="input" type="email" value={r.contact} onChange={(e) => set({ contact: e.target.value })} /></label>
            </div>) })}

          {Section({ n: 8, title: 'Review and publish', children: (
            <>
              <p className="small" style={{ color: 'var(--ink-2)' }}>Publishing puts the regatta on the public list. Entries open on {r.entriesOpen} automatically.</p>
              <div className="hstack">
                <Link to={`/r/${r.id}`} className="btn">Preview public page</Link>
                {r.status === 'open'
                  ? <button className="btn danger" onClick={() => { if (confirm('Hide this regatta from the public list?')) set({ status: 'draft' }); }}>Unpublish</button>
                  : <button className="btn primary" disabled={!ready} onClick={() => { set({ status: 'open' }); toast('Published! Clubs can now find it.'); }}>{ready ? 'Publish' : `Publish (finish ${required.filter((k) => !done[k]).length} more)`}</button>}
              </div>
            </>) })}
        </div>

        <aside className="side-col">
          <section className="card stack">
            <h2 style={{ fontSize: 18 }}>{r.status === 'open' ? 'Published' : 'Ready to publish?'}</h2>
            <div className="progress"><i style={{ width: `${(doneCount / 8) * 100}%` }} /></div>
            <div className="small" style={{ color: 'var(--ink-2)' }}>{doneCount} of 8 sections done</div>
            {[[1, 'Name, dates and venue'], [2, 'Events, each with a fee'], [3, 'Entry open and close dates'], [4, 'Payout account connected'], [5, 'Race times'], [7, 'Venue details and a contact']].map(([k, label]) => (
              <button key={k} className="hstack small" style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', flexWrap: 'nowrap', textAlign: 'left' }} onClick={() => setOpen(k)}>
                <span style={{ width: 18, height: 18, flex: '0 0 18px', borderRadius: '50%', background: done[k] ? 'var(--green)' : '#fff', border: done[k] ? 0 : '2px solid #AEB8C6' }} />
                <span style={{ color: done[k] ? 'var(--ink-2)' : 'var(--ink)' }}>{label}</span>
              </button>
            ))}
          </section>
          {r.events.length > 0 && <section className="card small stack" style={{ color: 'var(--ink-2)' }}><h3 style={{ color: 'var(--ink)' }}>Fee check</h3>{r.events.slice(0, 3).map((e) => <div key={e.id} className="spread"><span>{e.name}</span><span className="num">{money(entryFee(r, e))}</span></div>)}</section>}
        </aside>
      </div>
    </main>
  );
}

// Spread event start times through each day using the interval and the number of heats.
function spaceTimes(rg) {
  for (const day of [1, 2]) {
    let t = rg.firstRace ?? 480;
    rg.events.filter((e) => (e.day || 1) === day).forEach((e) => {
      e.time = t;
      const heats = rg.format === 'Sprint' ? Math.ceil(e.cap / rg.lanes) : 1;
      t += heats * (rg.interval || 7);
    });
  }
}
