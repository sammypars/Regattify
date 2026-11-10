import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore, getRegatta, entriesFor, entryInfo, fieldCount, addCrew, removeCrew, getEvent } from '../store';
import { fmtDay, fmtTime, money, untilText, daysUntil, CATEGORIES, plural, entryFee, dayOfEvent } from '../lib';
import { Search, Empty, useToast, Icon } from '../components/ui';
import { BackLink } from '../components/Layout';
import { regattaStatus } from './Regattas';

export default function Enter() {
  const { id } = useParams();
  const { db, update } = useStore();
  const r = getRegatta(db, id);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);
  const [, toast, toastEl] = useToast();
  if (!r) return <main className="page"><Empty title="Regatta not found" /></main>;
  const st = regattaStatus(r);
  const mine = entriesFor(db, r.id, db.myClubId);
  const cats = CATEGORIES.filter((c) => r.events.some((e) => e.cat === c));
  const activeCat = cat || cats[0];
  const events = r.events
    .filter((e) => (q ? e.name.toLowerCase().includes(q.toLowerCase()) || e.num === q : e.cat === activeCat))
    .sort((a, b) => a.day - b.day || a.time - b.time);
  const drafts = mine.filter((e) => e.status === 'draft');
  const fees = drafts.reduce((s, e) => s + entryInfo(db, e).fee, 0);
  const notFull = mine.filter((e) => !entryInfo(db, e).full).length;
  const sortedMine = [...mine].sort((a, b) => { const ea = getEvent(r, a.eventId), eb = getEvent(r, b.eventId); return ea.day - eb.day || ea.time - eb.time || a.crew.localeCompare(b.crew); });

  return (
    <main className="page">
      {toastEl}
      <div>
        <BackLink to={`/r/${r.id}`}>{r.name}</BackLink>
        <div className="head" style={{ marginTop: 6 }}>
          <div><h1>Enter your crews</h1><p className="muted" style={{ marginTop: 4 }}>{fmtDay(r.startDate)} · {r.venue} · {r.format}, {r.course}</p></div>
          {st.open
            ? <div className={`callout ${daysUntil(r.entriesClose) <= 3 ? 'warn' : 'info'}`} style={{ fontWeight: 600 }}><Icon name="clock" size={18} />Entries close {untilText(r.entriesClose)} · lineups can wait until race day</div>
            : <div className="callout gray" style={{ fontWeight: 600 }}>{st.text}. You can still edit lineups.</div>}
        </div>
      </div>

      <div className="row">
        <section className="main-col" aria-labelledby="ev-h">
          <div className="card stack">
            <div className="spread"><h2 id="ev-h">Add events</h2><span className="small muted">Tap + for each crew you’re sending</span></div>
            <Search value={q} onChange={setQ} placeholder="Search events (e.g. “4x” or “Women”)" />
            {!q && <div className="chips">{cats.map((c) => <button key={c} className={`chip${activeCat === c ? ' on' : ''}`} aria-pressed={activeCat === c} onClick={() => setCat(c)}>{c}</button>)}</div>}
          </div>
          <div className="stack-sm">
            {events.length === 0 && <div className="card empty">No events match.</div>}
            {events.map((e) => {
              const crews = mine.filter((x) => x.eventId === e.id);
              const draftsHere = crews.filter((x) => x.status === 'draft').length;
              const n = fieldCount(db, r.id, e.id);
              const full = n >= e.cap;
              const atMax = crews.length >= r.maxCrews;
              return (
                <div key={e.id} className="card tight hstack" style={{ flexWrap: 'nowrap', border: crews.length ? '2px solid var(--blue)' : undefined }}>
                  <div className="grow">
                    <div className="bold">{e.name}</div>
                    <div className="small" style={{ color: full ? 'var(--orange-ink)' : 'var(--muted)' }}>
                      #{e.num} · {fmtDay(dayOfEvent(r, e)).split(',')[0]} {fmtTime(e.time)} · {full ? 'Full' : `${n} of ${e.cap}`} · {money(entryFee(r, e))}
                    </div>
                  </div>
                  {full && !crews.length ? (
                    <button className="btn sm" onClick={() => toast(`You’re on the waitlist for ${e.name}`)}>Waitlist</button>
                  ) : (
                    <div className="stepper">
                      <button aria-label={`Remove a crew from ${e.name}`} disabled={!draftsHere || !st.open} onClick={() => update((d) => removeCrew(d, r.id, db.myClubId, e.id))}>−</button>
                      <span aria-live="polite">{crews.length}</span>
                      <button className="plus" aria-label={`Add a crew to ${e.name}`} disabled={!st.open || full || atMax}
                        onClick={() => update((d) => addCrew(d, r.id, db.myClubId, e))}>+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="side-col">
          <section className="card stack" aria-labelledby="cart-h">
            <div className="spread"><h2 id="cart-h">Your entries</h2><span className="small muted">{plural(mine.length, 'crew')}</span></div>
            <p className="small muted">Saved as you go. Any coach at your club can pick up where you left off.</p>
            {mine.length === 0 && <p className="small muted">Nothing yet. Tap + next to an event.</p>}
            <div>
              {sortedMine.map((e) => {
                const info = entryInfo(db, e);
                const tone = info.full ? 'var(--green)' : info.filled ? 'var(--orange)' : 'var(--faint)';
                return (
                  <div key={e.id} className="list-row" style={{ gap: 10 }}>
                    <div className="grow">
                      <div className="bold small">{info.event.name} · {e.crew}</div>
                      <div className="hstack tiny" style={{ gap: 6, color: info.full ? 'var(--green)' : 'var(--muted)' }}>
                        <span className="dot" style={{ background: tone }} />
                        {info.full ? 'Lineup full' : info.filled ? `${info.filled} of ${info.total} seats` : 'No names yet'}
                        {e.status === 'submitted' && <span className="pill green">Submitted</span>}
                      </div>
                    </div>
                    <span className="small num">{money(info.fee)}</span>
                    <Link to={`/lineups/${r.id}?entry=${e.id}`} className="small bold" style={{ textDecoration: 'none' }}>Lineup</Link>
                  </div>
                );
              })}
            </div>
            {drafts.length > 0 && (
              <>
                <div className="spread" style={{ borderTop: '1px solid var(--line)', paddingTop: 12, fontWeight: 700, fontSize: 16 }}><span>To submit ({drafts.length})</span><span className="num">{money(fees)}</span></div>
                <Link to={`/r/${r.id}/checkout`} className="btn primary lg block hide-phone">Review and pay</Link>
                {notFull > 0 && <p className="tiny muted">{notFull} lineup{notFull === 1 ? ' isn’t' : 's aren’t'} full. That’s fine: you can add names after you submit.</p>}
              </>
            )}
          </section>
        </aside>
      </div>

      {drafts.length > 0 && (
        <div className="sticky-bar">
          <div className="grow"><div className="tiny muted">{plural(drafts.length, 'crew')} to submit</div><div className="bold">{money(fees)}</div></div>
          <Link to={`/r/${r.id}/checkout`} className="btn primary">Review and pay</Link>
        </div>
      )}
    </main>
  );
}
