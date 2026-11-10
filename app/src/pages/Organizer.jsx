import { Link, useParams } from 'react-router-dom';
import { useStore, getRegatta, getClub, regattaStats, fieldCount, getEvent, logActivity, entriesFor } from '../store';
import { fmtRange, untilText, daysUntil, money, plural, entryFee, uid, todayIso, fmtTime, seatCount } from '../lib';
import { Bar, Empty, useToast } from '../components/ui';
import { regattaStatus } from './Regattas';

export function HostTabs({ r, active }) {
  return (
    <nav className="hostnav" aria-label="Regatta admin">
      <Link to={`/host/${r.id}`} className={active === 'overview' ? 'active' : ''}>Overview</Link>
      <Link to={`/host/${r.id}/setup`} className={active === 'setup' ? 'active' : ''}>Setup</Link>
      <Link to={`/host/${r.id}/payouts`} className={active === 'payouts' ? 'active' : ''}>Payments</Link>
      <Link to={`/r/${r.id}`}>Public page</Link>
    </nav>
  );
}

export default function Organizer() {
  const { id } = useParams();
  const { db, update } = useStore();
  const r = getRegatta(db, id);
  const [, toast, toastEl] = useToast();
  if (!r || r.hostClubId !== db.myClubId) return <main className="page"><Empty title="Regatta not found"><Link to="/host">Back to hosting</Link></Empty></main>;
  const st = regattaStatus(r);
  const s = regattaStats(db, r.id);
  const requests = db.requests.filter((q) => q.regattaId === r.id && q.status === 'open');
  const activity = db.activity.filter((a) => a.regattaId === r.id).slice(0, 8);
  const events = r.events.map((e) => ({ e, n: fieldCount(db, r.id, e.id) })).sort((a, b) => b.n / b.e.cap - a.n / a.e.cap);
  const edit = (fn) => update((d) => fn(d.regattas.find((x) => x.id === r.id), d));

  const decide = (q, ok) => {
    update((d) => {
      const rq = d.requests.find((x) => x.id === q.id); rq.status = ok ? 'approved' : 'declined';
      const club = getClub(d, q.clubId);
      if (ok && q.type === 'Scratch') {
        const en = d.entries.filter((x) => x.regattaId === r.id && x.clubId === q.clubId && x.eventId === q.eventId).pop();
        if (en) {
          d.entries = d.entries.filter((x) => x.id !== en.id);
          if (en.paid && r.refundPolicy !== 'No refunds') {
            const fee = entryFee(r, getEvent(r, en.eventId));
            d.payments.push({ id: uid('p'), regattaId: r.id, clubId: q.clubId, amount: r.refundPolicy.startsWith('50') ? fee / 2 : fee, method: 'Refund', date: todayIso(), kind: 'refund' });
          }
        }
      }
      if (ok && q.type === 'Late entry') {
        const ev = getEvent(r, q.eventId);
        d.entries.push({ id: uid('en'), regattaId: r.id, clubId: q.clubId, eventId: q.eventId, crew: 'A', seats: Array(seatCount(ev.boat)).fill(null), status: 'submitted', paid: false });
      }
      logActivity(d, r.id, `${ok ? 'Approved' : 'Declined'}: ${q.type.toLowerCase()} from ${club?.name}`);
    });
    toast(ok ? `${q.type} approved${q.type === 'Scratch' ? ' · refund sent' : ''}` : 'Declined');
  };

  return (
    <main className="page">
      {toastEl}
      <div className="head">
        <div>
          <p className="eyebrow">Hosting · {fmtRange(r.startDate, r.endDate)}</p>
          <h1 style={{ marginTop: 2 }}>{r.name || 'Untitled regatta'}</h1>
          <div className="hstack" style={{ marginTop: 6 }}><span className={`pill ${st.tone}`}>{st.text}</span>{r.status === 'open' && daysUntil(r.entriesClose) >= 0 && <span className="small muted">Entries close {untilText(r.entriesClose)}</span>}</div>
        </div>
        <div className="hstack">
          <a className="btn" href={`mailto:?bcc=${encodeURIComponent('')}&subject=${encodeURIComponent(r.name)}`}>Message all clubs</a>
          {r.status === 'draft' && <Link to={`/host/${r.id}/setup`} className="btn primary">Finish setup</Link>}
        </div>
      </div>
      <HostTabs r={r} active="overview" />

      <div className="grid-4">
        <div className="stat"><div className="k">Clubs entered</div><div className="v">{s.clubs}</div></div>
        <div className="stat"><div className="k">Entries</div><div className="v">{s.entries}</div><div className="s">of {s.slots} lane slots</div></div>
        <div className="stat"><div className="k">Collected</div><div className="v">{money(s.collected - s.refunded)}</div><div className="s">{plural(s.unpaid.length, 'club')} unpaid</div></div>
        <div className="stat"><div className="k">Full events</div><div className="v">{events.filter((x) => x.n >= x.e.cap).length}</div><div className="s">of {r.events.length}</div></div>
      </div>

      <div className="row">
        <section className="main-col card flush" aria-labelledby="fill-h">
          <div className="card-head"><h2 id="fill-h" style={{ fontSize: 18 }}>Events</h2><span className="small muted">Most full first</span></div>
          {r.events.length === 0 ? <Empty title="No events yet"><Link to={`/host/${r.id}/setup`}>Add events in setup</Link></Empty> : (
            <div className="table-wrap"><table className="t" style={{ minWidth: 560 }}>
              <thead><tr><th>Event</th><th>Filled</th><th>Races</th><th>Cap</th></tr></thead>
              <tbody>{events.map(({ e, n }) => (
                <tr key={e.id}>
                  <td className="bold">{e.name}<div className="tiny muted" style={{ fontWeight: 400 }}>First race {fmtTime(e.time)}</div></td>
                  <td><span className="hstack" style={{ gap: 8, flexWrap: 'nowrap' }}><Bar value={n} max={e.cap} /><span className="small">{n} / {e.cap}</span></span></td>
                  <td className="muted small">{e.progression}</td>
                  <td><div className="stepper"><button aria-label={`Lower cap for ${e.name}`} disabled={e.cap <= Math.max(1, n)} onClick={() => edit((rg) => { const x = rg.events.find((y) => y.id === e.id); x.cap--; })}>−</button><span>{e.cap}</span><button className="plus" aria-label={`Raise cap for ${e.name}`} onClick={() => edit((rg) => { const x = rg.events.find((y) => y.id === e.id); x.cap++; })}>+</button></div></td>
                </tr>))}</tbody>
            </table></div>
          )}
        </section>

        <aside className="side-col">
          <section className="card stack" aria-labelledby="race-h">
            <h2 id="race-h" style={{ fontSize: 18 }}>Draw and race day</h2>
            <div className="spread small"><span className="muted">Draw</span><span className="bold">{r.drawPublished ? 'Published' : 'Not published'}</span></div>
            <button className={`btn ${r.drawPublished ? '' : 'dark'}`} onClick={() => { edit((rg, d) => { rg.drawPublished = !rg.drawPublished; logActivity(d, r.id, rg.drawPublished ? 'Draw and schedule published' : 'Draw unpublished'); }); toast(r.drawPublished ? 'Draw hidden' : 'Draw published: clubs see lanes and times'); }}>{r.drawPublished ? 'Unpublish draw' : 'Publish draw and lanes'}</button>
            <div className="spread small" style={{ marginTop: 6 }}><span className="muted">Running behind</span><span className="bold">{r.delayMin} min</span></div>
            <div className="hstack">
              <button className="btn sm" onClick={() => edit((rg) => { rg.delayMin += 5; })}>+5 min</button>
              <button className="btn sm" disabled={!r.delayMin} onClick={() => edit((rg) => { rg.delayMin = Math.max(0, rg.delayMin - 5); })}>−5 min</button>
              <button className="btn sm ghost" disabled={!r.delayMin} onClick={() => edit((rg) => { rg.delayMin = 0; })}>On time</button>
            </div>
            <p className="hint">Every club schedule and the public page update right away.</p>
          </section>
        </aside>
      </div>

      <div className="row">
        <section className="main-col card" aria-labelledby="req-h">
          <h2 id="req-h" style={{ fontSize: 18, marginBottom: 4 }}>Waiting on you{requests.length ? ` · ${requests.length}` : ''}</h2>
          {requests.length === 0 && <p className="small muted" style={{ padding: '8px 0' }}>Nothing to approve right now.</p>}
          {requests.map((q) => (
            <div key={q.id} className="list-row" style={{ flexWrap: 'wrap' }}>
              <div className="grow" style={{ flexBasis: 240 }}><div className="bold small">{q.type}: {getClub(db, q.clubId)?.name}</div><div className="small muted">{q.detail}</div></div>
              <button className="btn sm" onClick={() => decide(q, false)}>Decline</button>
              <button className="btn sm primary" onClick={() => decide(q, true)}>Approve</button>
            </div>
          ))}
        </section>
        <section className="side-col card" aria-labelledby="feed-h">
          <div className="spread"><h2 id="feed-h" style={{ fontSize: 18 }}>Activity</h2><span className="hstack tiny bold" style={{ gap: 6, color: 'var(--green)' }}><span className="dot" style={{ background: 'var(--green)' }} />LIVE</span></div>
          {activity.length === 0 && <p className="small muted" style={{ paddingTop: 8 }}>Club activity shows up here.</p>}
          {activity.map((a) => <div key={a.id} className="list-row small" style={{ display: 'block' }}>{a.text}<div className="tiny muted">{a.at.replace('T', ' ')}</div></div>)}
          <p className="tiny muted" style={{ marginTop: 8 }}>{plural(entriesFor(db, r.id).filter((e) => e.status === 'draft').length, 'crew')} started but not submitted yet.</p>
        </section>
      </div>
    </main>
  );
}
