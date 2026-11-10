import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, myClub, isAdmin } from '../store';
import { EMAIL_RE, initials, fmtDate } from '../lib';
import { ClubBadge, useToast } from '../components/ui';

export const COLORS = [['#F2A33A', 'Gold'], ['#1F4FD8', 'Blue'], ['#12724A', 'Green'], ['#B42318', 'Red'], ['#6D28D9', 'Purple'], ['#0E1726', 'Navy']];

export default function Club() {
  const { db, update } = useStore();
  const nav = useNavigate();
  const club = myClub(db);
  const admin = isAdmin(db);
  const me = db.session.email;
  const [draft, setDraft] = useState('');
  const [draftRole, setDraftRole] = useState('Coach');
  const [notice, setNotice] = useState(null);
  const [details, setDetails] = useState({ name: club.name, short: club.short, city: club.city, color: club.color });
  const [, toast, toastEl] = useToast();

  const activeAdmins = club.members.filter((m) => m.role === 'Admin' && m.status === 'Active').length;
  const editClub = (fn) => update((d) => fn(d.clubs.find((c) => c.id === club.id)));

  const invite = () => {
    const parts = draft.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const good = [...new Set(parts.filter((s) => EMAIL_RE.test(s) && !club.members.some((m) => m.email === s)))];
    const bad = parts.filter((s) => !EMAIL_RE.test(s));
    if (!good.length) { setNotice({ bad: true, text: bad.length ? `That doesn’t look like an email: ${bad[0]}` : 'Type at least one new email.' }); return; }
    editClub((c) => { good.forEach((email) => c.members.push({ email, name: '', role: draftRole, status: 'Invited' })); });
    setDraft('');
    setNotice({ bad: bad.length > 0, text: `${good.length} invite${good.length === 1 ? '' : 's'} sent${bad.length ? ` · skipped ${bad.join(', ')}` : ''}` });
  };
  const setRole = (m, role) => {
    if (m.role === 'Admin' && role !== 'Admin' && m.status === 'Active' && activeAdmins === 1) { setNotice({ bad: true, text: 'Make someone else an admin first.' }); return; }
    editClub((c) => { c.members.find((x) => x.email === m.email).role = role; });
  };
  const remove = (m) => {
    if (m.role === 'Admin' && m.status === 'Active' && activeAdmins === 1) { setNotice({ bad: true, text: 'A club needs at least one admin.' }); return; }
    if (m.status === 'Active' && !confirm(`Remove ${m.name || m.email} from ${club.name}?`)) return;
    editClub((c) => { c.members = c.members.filter((x) => x.email !== m.email); });
  };
  const leave = () => {
    const meM = club.members.find((m) => m.email === me);
    if (meM?.role === 'Admin' && activeAdmins === 1 && club.members.filter((m) => m.status === 'Active').length > 1) { setNotice({ bad: true, text: 'Make someone else an admin before you leave.' }); return; }
    if (!confirm(`Leave ${club.name}? You’ll lose access to its entries and schedules.`)) return;
    update((d) => { const c = d.clubs.find((x) => x.id === club.id); c.members = c.members.filter((x) => x.email !== me); d.myClubId = null; });
    nav('/signup');
  };

  const active = club.members.filter((m) => m.status === 'Active').length;
  const invited = club.members.length - active;

  return (
    <main className="page narrow">
      {toastEl}
      <div className="head">
        <div className="hstack" style={{ gap: 14 }}>
          <ClubBadge club={club} size={52} />
          <div><h1>{club.name}</h1><p className="muted">{admin ? 'You’re an admin of this club.' : 'You’re a coach at this club. Only admins can change these settings.'}</p></div>
        </div>
        <button className="btn" onClick={() => { update((d) => { d.session = null; }); nav('/signup'); }}>Sign out</button>
      </div>

      <section className="card stack" aria-labelledby="coach-h" style={{ gap: 16 }}>
        <div className="spread"><h2 id="coach-h">Who can manage this club</h2><span className="small muted">{active} active{invited ? ` · ${invited} invited` : ''}</span></div>

        {admin && club.requests.map((rq) => (
          <div key={rq.email} className="callout warn" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="grow" style={{ flexBasis: 240 }}><div className="bold" style={{ color: 'var(--ink)' }}>{rq.name} asked to join</div><div className="small">{rq.email} · {fmtDate(rq.date)}</div></div>
            <button className="btn sm danger" onClick={() => editClub((c) => { c.requests = c.requests.filter((x) => x.email !== rq.email); })}>Decline</button>
            <button className="btn sm primary" onClick={() => { editClub((c) => { c.requests = c.requests.filter((x) => x.email !== rq.email); c.members.push({ email: rq.email, name: rq.name, role: 'Coach', status: 'Active' }); }); toast(`${rq.name} can now manage entries`); }}>Approve as coach</button>
          </div>
        ))}

        <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          {club.members.map((m, i) => {
            const you = m.email === me;
            return (
              <div key={m.email} className="hstack" style={{ padding: '12px 16px', borderTop: i ? '1px solid var(--line-2)' : 0, gap: 14 }}>
                <span className="av" style={{ width: 38, height: 38, flexBasis: 38, background: m.status === 'Active' ? undefined : 'var(--gray-soft)', color: m.status === 'Active' ? undefined : 'var(--ink-2)' }}>{initials(m.name || m.email)}</span>
                <div className="grow" style={{ flexBasis: 200 }}>
                  <div className="bold">{m.name || m.email.split('@')[0]}{you ? ' (you)' : ''}</div>
                  <div className="small muted">{m.email}</div>
                </div>
                <span className={`pill ${m.status === 'Active' ? 'green' : ''}`}>{m.status === 'Active' ? 'Active' : 'Invite sent'}</span>
                {admin && !you ? (
                  <>
                    <label><span className="sr">Role for {m.email}</span>
                      <select className="select" style={{ width: 120 }} value={m.role} onChange={(e) => setRole(m, e.target.value)}><option>Admin</option><option>Coach</option></select></label>
                    <button className="btn sm ghost" style={{ color: 'var(--orange-ink)', width: 80 }} onClick={() => remove(m)}>{m.status === 'Active' ? 'Remove' : 'Cancel'}</button>
                  </>
                ) : <span className="small bold" style={{ width: admin ? 208 : 'auto', color: 'var(--ink-2)' }}>{m.role}</span>}
              </div>
            );
          })}
        </div>

        {admin && (
          <div className="stack" style={{ background: 'var(--bg)', borderRadius: 12, padding: 16 }}>
            <label htmlFor="invite" className="bold">Add people by email</label>
            <div className="hstack">
              <input id="invite" className="input grow" style={{ flexBasis: 280, minHeight: 48 }} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') invite(); }} placeholder="Paste one or more emails, separated by commas" />
              <label><span className="sr">Role for new people</span>
                <select className="select" style={{ minHeight: 48, width: 'auto' }} value={draftRole} onChange={(e) => setDraftRole(e.target.value)}><option value="Coach">as Coach</option><option value="Admin">as Admin</option></select></label>
              <button className="btn primary" style={{ minHeight: 48 }} onClick={invite}>Send invites</button>
            </div>
            {notice && <p role="status" className={notice.bad ? 'error' : 'okmsg'}>{notice.text}</p>}
            <p className="hint">They get an email with a sign-in link. No password to set up. If they don’t have an account yet, the link creates one.</p>
          </div>
        )}

        <div className="grid-2">
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}><div className="bold">Coach</div><div className="small" style={{ color: 'var(--ink-2)' }}>Enters regattas, edits lineups, sees schedules, pays invoices.</div></div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}><div className="bold">Admin</div><div className="small" style={{ color: 'var(--ink-2)' }}>Everything a coach can do, plus club details, adding and removing people, and hosting regattas.</div></div>
        </div>
        <p className="hint">A club always keeps at least one admin.</p>
      </section>

      <section className="card stack" aria-labelledby="det-h" style={{ gap: 16 }}>
        <h2 id="det-h">Club details</h2>
        <fieldset disabled={!admin} style={{ border: 0, padding: 0, margin: 0 }} className="stack">
          <div className="grid-2">
            <label className="field">Club name<input className="input" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} /></label>
            <label className="field">Short name (on results and schedules)<input className="input" maxLength={6} value={details.short} onChange={(e) => setDetails({ ...details, short: e.target.value.toUpperCase() })} /></label>
            <label className="field">City<input className="input" value={details.city} onChange={(e) => setDetails({ ...details, city: e.target.value })} /></label>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="field" style={{ marginBottom: 6 }}>Club color</legend>
              <div className="hstack" style={{ gap: 8 }}>
                {COLORS.map(([hex, name]) => <button key={hex} type="button" aria-label={name} aria-pressed={details.color === hex} onClick={() => setDetails({ ...details, color: hex })} style={{ width: 40, height: 40, borderRadius: 10, background: hex, border: details.color === hex ? '3px solid var(--ink)' : '1px solid var(--field)', cursor: 'pointer' }} />)}
              </div>
            </fieldset>
          </div>
          {admin && <div className="hstack" style={{ justifyContent: 'flex-end' }}><button className="btn dark" disabled={!details.name.trim() || !details.short.trim()} onClick={() => { editClub((c) => Object.assign(c, { ...details, name: details.name.trim() })); toast('Club details saved'); }}>Save details</button></div>}
        </fieldset>
      </section>

      <section className="card hstack" style={{ gap: 14 }}>
        <div className="grow" style={{ flexBasis: 280 }}><div className="bold">Leave this club</div><div className="small muted">You’ll lose access to its entries and schedules.</div></div>
        <button className="btn danger" onClick={leave}>Leave club</button>
      </section>
    </main>
  );
}
