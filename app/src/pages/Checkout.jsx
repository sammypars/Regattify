import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore, getRegatta, entriesFor, entryInfo, getClub, logActivity, myClub } from '../store';
import { money, plural, BOATS, platformFee, PLATFORM_FEE, uid, todayIso, fmtDay, EMAIL_RE } from '../lib';
import { Empty, Icon } from '../components/ui';
import { BackLink } from '../components/Layout';

export default function Checkout() {
  const { id } = useParams();
  const { db, update } = useStore();
  const r = getRegatta(db, id);
  const [method, setMethod] = useState('pay');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  if (!r) return <main className="page"><Empty title="Regatta not found" /></main>;

  if (done) {
    return (
      <main className="page narrow">
        <section className="card good stack center" style={{ alignItems: 'center', padding: 32 }}>
          <span className="badge" style={{ width: 56, height: 56, flexBasis: 56, borderRadius: '50%', background: 'var(--green)', color: '#fff' }}><Icon name="check" size={28} width={2.4} /></span>
          <h1>Entries submitted</h1>
          <p className="muted">{plural(done.count, 'crew')} entered in {r.name}. {done.method === 'pay' ? `Payment of ${money(done.total)} recorded.` : `Invoice for ${money(done.total)} emailed to ${done.email}.`}</p>
          <p className="small muted">Demo: no real money moved. Real payments start once a payment provider is connected.</p>
          <div className="hstack" style={{ justifyContent: 'center' }}>
            <Link to={`/lineups/${r.id}`} className="btn">Finish lineups</Link>
            <Link to="/" className="btn primary">Back to home</Link>
          </div>
        </section>
      </main>
    );
  }

  const drafts = entriesFor(db, r.id, db.myClubId).filter((e) => e.status === 'draft');
  if (!drafts.length) return <main className="page narrow"><Empty title="Nothing to submit">All your crews for this regatta are already submitted. <Link to={`/r/${r.id}/enter`}>Add more events</Link></Empty></main>;

  const groups = {};
  let fees = 0;
  for (const e of drafts) {
    const info = entryInfo(db, e);
    const key = BOATS[info.event.boat].label;
    groups[key] ||= { count: 0, total: 0 };
    groups[key].count++; groups[key].total += info.fee; fees += info.fee;
  }
  const pfee = platformFee(fees, drafts.length);
  const total = fees + (r.feePaidBy === 'club' ? pfee : 0);
  const notFull = drafts.filter((e) => !entryInfo(db, e).full).length;
  const club = myClub(db);

  const submit = () => {
    if (method === 'invoice' && !EMAIL_RE.test(email.trim())) { setErr('Enter the email the invoice should go to.'); return; }
    update((d) => {
      d.entries.forEach((e) => { if (e.regattaId === r.id && e.clubId === d.myClubId && e.status === 'draft') { e.status = 'submitted'; e.paid = method === 'pay'; } });
      if (method === 'pay') d.payments.push({ id: uid('p'), regattaId: r.id, clubId: d.myClubId, amount: total, method: 'Card', date: todayIso(), kind: 'payment' });
      logActivity(d, r.id, `${club.name} entered ${plural(drafts.length, 'crew')}${method === 'pay' ? ' and paid' : ' (invoice emailed)'}`);
    });
    setDone({ count: drafts.length, total, method, email: email.trim() });
  };

  return (
    <main className="page narrow">
      <div>
        <BackLink to={`/r/${r.id}/enter`}>Back to entries</BackLink>
        <h1 style={{ marginTop: 6 }}>Review and pay</h1>
        <p className="muted" style={{ marginTop: 4 }}>{r.name} · {fmtDay(r.startDate)}</p>
      </div>
      <div className="row">
        <div className="main-col">
          <section className="card">
            <h2 style={{ fontSize: 18, marginBottom: 6 }}>{plural(drafts.length, 'crew')} from {club.name}</h2>
            {Object.entries(groups).map(([label, g]) => (
              <div key={label} className="list-row spread"><span>{g.count} × {g.count === 1 ? label : `${label}s`}</span><span className="num">{money(g.total)}</span></div>
            ))}
            {pfee > 0 && <div className="list-row spread muted"><span>Regattify fee{PLATFORM_FEE.percent ? ` (${PLATFORM_FEE.percent}%)` : ''}{r.feePaidBy !== 'club' ? ' · paid by host' : ''}</span><span className="num">{money(pfee)}</span></div>}
            <div className="list-row spread" style={{ fontWeight: 700, fontSize: 18, borderTop: '1px solid var(--line)' }}><span>Total</span><span className="num">{money(total)}</span></div>
          </section>
          {notFull > 0 && <div className="callout info"><Icon name="info" />{notFull} crew{notFull === 1 ? ' doesn’t' : 's don’t'} have a full lineup yet. That’s fine: you can add names until {r.lineupDeadlineHrs} hours before each race.</div>}
        </div>
        <aside className="side-col">
          <fieldset className="card stack" style={{ margin: 0 }}>
            <legend className="sr">How do you want to pay?</legend>
            <h2 style={{ fontSize: 18 }}>How do you want to pay?</h2>
            <label className={`radio-card${method === 'pay' ? ' on' : ''}`}>
              <input type="radio" name="pay" checked={method === 'pay'} onChange={() => setMethod('pay')} />
              <span className="grow"><span className="bold" style={{ display: 'block' }}>Card or bank, now</span><span className="small muted">Opens a secure payment page</span></span>
            </label>
            <label className={`radio-card${method === 'invoice' ? ' on' : ''}`}>
              <input type="radio" name="pay" checked={method === 'invoice'} onChange={() => setMethod('invoice')} />
              <span className="grow"><span className="bold" style={{ display: 'block' }}>Email the invoice</span><span className="small muted">For a treasurer or parent board</span></span>
            </label>
            {method === 'invoice' && (
              <label className="field">Send invoice to<input className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="treasurer@example.org" /></label>
            )}
            {err && <p className="error" role="alert">{err}</p>}
            <button className="btn primary lg block" onClick={submit}>{method === 'pay' ? `Submit and pay ${money(total)}` : 'Submit and send invoice'}</button>
            <p className="tiny muted center">{r.refundPolicy}. Hosted by {getClub(db, r.hostClubId)?.name}.</p>
          </fieldset>
        </aside>
      </div>
    </main>
  );
}
