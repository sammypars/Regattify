import { Link, useParams } from 'react-router-dom';
import { useStore, getRegatta, getClub, regattaStats, entriesFor, logActivity } from '../store';
import { money, platformFee, PLATFORM_FEE, fmtDate, plural } from '../lib';
import { Empty, Icon, useToast } from '../components/ui';
import { HostTabs } from './Organizer';

export default function Payouts() {
  const { id } = useParams();
  const { db, update } = useStore();
  const r = getRegatta(db, id);
  const [, toast, toastEl] = useToast();
  if (!r || r.hostClubId !== db.myClubId) return <main className="page"><Empty title="Regatta not found" /></main>;
  const s = regattaStats(db, r.id);
  const net = s.collected - s.refunded;
  const count = entriesFor(db, r.id).filter((e) => e.status === 'submitted' && e.paid).length;
  const pfee = r.feePaidBy === 'host' ? platformFee(net, count) : 0;
  const clubs = Object.keys(s.owed).map((cid) => ({ club: getClub(db, cid), owed: s.owed[cid], paid: s.paidBy[cid] || 0,
    crews: entriesFor(db, r.id, cid).filter((e) => e.status === 'submitted').length,
    refunds: db.payments.filter((p) => p.regattaId === r.id && p.clubId === cid && p.kind === 'refund').length }))
    .sort((a, b) => (a.paid >= a.owed) - (b.paid >= b.owed) || a.club.name.localeCompare(b.club.name));
  const recent = db.payments.filter((p) => p.regattaId === r.id).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const edit = (patch) => update((d) => Object.assign(d.regattas.find((x) => x.id === r.id), patch));

  return (
    <main className="page">
      {toastEl}
      <div className="head">
        <div><p className="eyebrow">{r.name}</p><h1 style={{ marginTop: 2 }}>Payments and payouts</h1></div>
        <span className="hstack small bold" style={{ gap: 8, color: r.payoutConnected ? 'var(--green)' : 'var(--orange-ink)' }}><span className="dot" style={{ background: r.payoutConnected ? 'var(--green)' : 'var(--orange)' }} />{r.payoutConnected ? 'Payout account connected' : 'Payout account not connected'}</span>
      </div>
      <HostTabs r={r} active="payouts" />

      <section className="card stack" aria-labelledby="flow-h" style={{ gap: 16 }}>
        <h2 id="flow-h">How the money moves</h2>
        <div className="flow">
          <div className="box"><span className="tiny bold" style={{ color: 'var(--blue)', letterSpacing: '0.06em' }}>1 · ENTERING CLUB</span><span className="bold">Pays at checkout</span><span className="small" style={{ color: 'var(--ink-2)' }}>Card or bank transfer on a secure payment page.</span></div>
          <div className="arrow"><Icon name="arrow" size={26} /></div>
          <div className="box" style={{ background: 'var(--bg)' }}><span className="tiny bold" style={{ color: 'var(--blue)', letterSpacing: '0.06em' }}>2 · PAYMENT PROVIDER</span><span className="bold">Splits it instantly</span><span className="small" style={{ color: 'var(--ink-2)' }}>Card fees and Regattify’s fee{PLATFORM_FEE.percent || PLATFORM_FEE.perEntry ? '' : ' (not set yet)'} come off automatically. Regattify never holds your money.</span></div>
          <div className="arrow"><Icon name="arrow" size={26} /></div>
          <div className="box" style={{ border: '2px solid var(--green)' }}><span className="tiny bold" style={{ color: 'var(--green)', letterSpacing: '0.06em' }}>3 · YOUR CLUB</span><span className="bold">Gets paid out</span><span className="small" style={{ color: 'var(--ink-2)' }}>The rest lands in your club’s bank account a few days later, on its own.</span></div>
        </div>
        {!r.payoutConnected && <div className="callout warn" style={{ alignItems: 'center', flexWrap: 'wrap' }}><span className="grow">Connect a payout account before clubs can pay you.</span><button className="btn sm dark" onClick={() => { edit({ payoutConnected: true }); toast('Connected (demo)'); }}>Connect account</button></div>}
      </section>

      <div className="grid-4">
        <div className="stat"><div className="k">Collected</div><div className="v">{money(s.collected)}</div><div className="s">{Object.keys(s.owed).length - s.unpaid.length} of {Object.keys(s.owed).length} clubs paid</div></div>
        <div className="stat"><div className="k">Refunded</div><div className="v">{money(s.refunded)}</div></div>
        <div className="stat"><div className="k">Regattify fee</div><div className="v">{money(pfee)}</div><div className="s">{r.feePaidBy === 'host' ? 'Taken from payouts' : 'Paid by entering clubs'}</div></div>
        <div className="stat"><div className="k">Yours (before card fees)</div><div className="v">{money(net - pfee)}</div><div className="s">Paid out automatically</div></div>
      </div>

      <div className="row">
        <section className="main-col card flush" aria-labelledby="clubs-h">
          <div className="card-head">
            <h2 id="clubs-h" style={{ fontSize: 18 }}>By club</h2>
            <button className="btn sm" disabled={!s.unpaid.length} onClick={() => { update((d) => logActivity(d, r.id, `Payment reminder sent to ${plural(s.unpaid.length, 'club')}`)); toast(`Reminder sent to ${plural(s.unpaid.length, 'club')}`); }}>Remind {s.unpaid.length} unpaid</button>
          </div>
          {clubs.length === 0 ? <Empty title="No entries yet" /> : (
            <div className="table-wrap"><table className="t" style={{ minWidth: 520 }}>
              <thead><tr><th>Club</th><th>Crews</th><th>Owed</th><th>Paid</th><th>Status</th></tr></thead>
              <tbody>{clubs.map(({ club, owed, paid, crews, refunds }) => {
                const ok = paid + 0.01 >= owed;
                return (
                  <tr key={club.id}>
                    <td className="bold">{club.name}</td><td>{crews}</td><td className="num">{money(owed)}</td><td className="num">{money(paid)}</td>
                    <td><span className={`pill ${ok ? (refunds ? 'blue' : 'green') : 'orange'}`}>{ok ? (refunds ? `Paid · ${plural(refunds, 'refund')}` : 'Paid') : 'Not paid yet'}</span></td>
                  </tr>);
              })}</tbody>
            </table></div>
          )}
        </section>
        <aside className="side-col">
          <section className="card stack">
            <h2 style={{ fontSize: 18 }}>Your settings</h2>
            <label className="field">Card and Regattify fees paid by<select className="select" value={r.feePaidBy} onChange={(e) => edit({ feePaidBy: e.target.value })}><option value="club">Entering club (added at checkout)</option><option value="host">Us (taken from payouts)</option></select></label>
            <label className="field">Scratch refunds<select className="select" value={r.refundPolicy} onChange={(e) => edit({ refundPolicy: e.target.value })}>{['Full refund before the draw', '50% refund before race week', 'No refunds'].map((p) => <option key={p}>{p}</option>)}</select></label>
            <p className="hint">When you approve a scratch, the refund goes back to that club automatically.</p>
          </section>
          <section className="card">
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Recent</h2>
            {recent.length === 0 && <p className="small muted">No payments yet.</p>}
            {recent.map((p) => (
              <div key={p.id} className="list-row small">
                <span className="grow"><span className="bold" style={{ display: 'block' }}>{getClub(db, p.clubId)?.name}</span><span className="muted">{p.kind === 'refund' ? 'Refund' : p.method} · {fmtDate(p.date)}</span></span>
                <span className="bold num" style={{ color: p.kind === 'refund' ? 'var(--orange-ink)' : undefined }}>{p.kind === 'refund' ? '−' : ''}{money(p.amount)}</span>
              </div>
            ))}
          </section>
          <p className="tiny muted">Demo: no real money moves yet. <Link to={`/host/${r.id}/setup`}>Setup</Link></p>
        </aside>
      </div>
    </main>
  );
}
