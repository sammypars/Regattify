import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore, myClub } from '../store';
import { EMAIL_RE, uid } from '../lib';
import { Logo, ClubBadge, Search, Icon } from '../components/ui';
import { COLORS } from './Club';

const autoShort = (name) => name.split(/\s+/).filter((w) => w && !['the', 'of', 'and'].includes(w.toLowerCase())).map((w) => w[0]).join('').toUpperCase().slice(0, 4);

export default function Signup() {
  const { db, update } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [pick, setPick] = useState(null);
  const [creating, setCreating] = useState(false);
  const [club, setClub] = useState({ name: '', short: '', city: '', color: '#1F4FD8', shortEdited: false });
  const [invites, setInvites] = useState('');

  const step = !db.session ? 1 : !myClub(db) ? 2 : 3;

  if (step === 3) {
    return (
      <main className="page narrow" style={{ maxWidth: 520 }}>
        <section className="card stack center" style={{ alignItems: 'center', padding: 28 }}>
          <ClubBadge club={myClub(db)} size={52} />
          <h1>You’re signed in</h1>
          <p className="muted">{db.session.name} · {myClub(db).name}</p>
          <div className="hstack" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => update((d) => { d.session = null; })}>Sign out</button>
            <Link to="/" className="btn primary">Go to home</Link>
          </div>
        </section>
      </main>
    );
  }

  const signIn = (e) => {
    e.preventDefault();
    if (!name.trim()) return setErr('Enter your name.');
    if (!EMAIL_RE.test(email.trim())) return setErr('Enter a valid email.');
    const em = email.trim().toLowerCase();
    update((d) => {
      d.session = { name: name.trim(), email: em };
      const existing = d.clubs.find((c) => c.members.some((m) => m.email === em));
      if (existing) { const m = existing.members.find((x) => x.email === em); m.status = 'Active'; if (!m.name) m.name = name.trim(); d.myClubId = existing.id; }
      else d.myClubId = null;
    });
    setErr('');
  };

  const join = () => {
    const c = db.clubs.find((x) => x.id === pick);
    update((d) => {
      const cl = d.clubs.find((x) => x.id === pick);
      // Demo: approved right away. Live app: an admin of the club approves the request.
      cl.members.push({ email: d.session.email, name: d.session.name, role: cl.members.length ? 'Coach' : 'Admin', status: 'Active' });
      d.myClubId = cl.id;
    });
    if (c) nav('/');
  };

  const create = (e) => {
    e.preventDefault();
    if (!club.name.trim()) return setErr('Give your club a name.');
    const emails = [...new Set(invites.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => EMAIL_RE.test(s)))];
    const id = uid('c');
    update((d) => {
      d.clubs.push({ id, name: club.name.trim(), short: (club.short || autoShort(club.name)).slice(0, 6), city: club.city.trim(), color: club.color,
        members: [{ email: d.session.email, name: d.session.name, role: 'Admin', status: 'Active' }, ...emails.filter((x) => x !== d.session.email).map((x) => ({ email: x, name: '', role: 'Coach', status: 'Invited' }))],
        requests: [] });
      d.myClubId = id;
    });
    nav('/');
  };

  const clubs = db.clubs.filter((c) => !q || `${c.name} ${c.city} ${c.short}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <main className="page" style={{ maxWidth: 560 }}>
      <div className="hstack" style={{ gap: 10 }}><Logo size={34} /><span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22 }}>Regattify</span></div>

      {step === 1 && (
        <form className="card stack" onSubmit={signIn} style={{ gap: 16 }}>
          <div><div className="small bold" style={{ color: 'var(--blue)' }}>Step 1 of 2</div><h1 style={{ marginTop: 4 }}>Sign in or create an account</h1>
            <p className="muted" style={{ marginTop: 6 }}>For coaches and regatta organizers. No password: we email you a sign-in link.</p></div>
          <label className="field">Your name<input className="input" style={{ minHeight: 52, fontSize: 16 }} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
          <label className="field">Email<input className="input" type="email" style={{ minHeight: 52, fontSize: 16 }} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn primary lg block">Continue</button>
          <p className="hint">Demo: you’re signed in right away. Tip: use patel@example.org to sign back in as the Riverside admin.</p>
        </form>
      )}

      {step === 2 && !creating && (
        <section className="card stack" style={{ gap: 16 }}>
          <div><div className="small bold" style={{ color: 'var(--blue)' }}>Step 2 of 2</div><h1 style={{ marginTop: 4 }}>Which club do you coach?</h1>
            <p className="muted" style={{ marginTop: 6 }}>Signed in as {db.session.email}. Pick your club so you can enter regattas for it.</p></div>
          <Search value={q} onChange={setQ} placeholder="Search clubs" />
          <div className="stack-sm">
            {clubs.map((c) => (
              <button key={c.id} className={`radio-card${pick === c.id ? ' on' : ''}`} onClick={() => setPick(c.id)} style={{ textAlign: 'left' }}>
                <ClubBadge club={c} size={38} />
                <span className="grow"><span className="bold" style={{ display: 'block' }}>{c.name}</span><span className="small muted">{c.city} · {c.members.filter((m) => m.status === 'Active').length} coaches on Regattify</span></span>
                {pick === c.id && <Icon name="check" color="var(--blue)" width={2.4} />}
              </button>
            ))}
          </div>
          {pick && <div className="callout gray">A coach already at this club approves you with one tap. (Demo: you’re approved right away.)</div>}
          <button className="btn primary lg block" disabled={!pick} onClick={join}>{pick ? `Ask to join ${db.clubs.find((c) => c.id === pick)?.short}` : 'Pick your club'}</button>
          <button className="btn ghost block" onClick={() => { setCreating(true); setErr(''); setClub((c) => ({ ...c, name: q })); }}>My club isn’t listed: create it</button>
        </section>
      )}

      {step === 2 && creating && (
        <form className="card stack" onSubmit={create} style={{ gap: 16 }}>
          <button type="button" className="eyebrow" style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--blue)' }} onClick={() => setCreating(false)}>← Back to the club list</button>
          <div><h1>Create your club</h1><p className="muted" style={{ marginTop: 6 }}>You’ll be its first admin. Takes about a minute.</p></div>
          <label className="field">Club name<input className="input" style={{ minHeight: 52, fontSize: 16 }} value={club.name} onChange={(e) => setClub({ ...club, name: e.target.value, short: club.shortEdited ? club.short : autoShort(e.target.value) })} /></label>
          <div className="grid-2" style={{ gridTemplateColumns: '130px minmax(0,1fr)' }}>
            <label className="field">Short name<input className="input" style={{ minHeight: 52, fontSize: 16 }} maxLength={6} value={club.short} onChange={(e) => setClub({ ...club, short: e.target.value.toUpperCase(), shortEdited: true })} /></label>
            <label className="field">City<input className="input" style={{ minHeight: 52, fontSize: 16 }} value={club.city} onChange={(e) => setClub({ ...club, city: e.target.value })} /></label>
          </div>
          <p className="hint" style={{ marginTop: -8 }}>The short name shows on schedules and results.</p>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="field" style={{ marginBottom: 8 }}>Club color</legend>
            <div className="hstack">{COLORS.map(([hex, n]) => <button key={hex} type="button" aria-label={n} aria-pressed={club.color === hex} onClick={() => setClub({ ...club, color: hex })} style={{ width: 44, height: 44, borderRadius: 12, background: hex, border: club.color === hex ? '3px solid var(--ink)' : '1px solid var(--field)', cursor: 'pointer' }} />)}</div>
          </fieldset>
          <label className="field">Other coaches who can manage it <span className="hint">(optional, separate with commas)</span>
            <textarea className="textarea" style={{ minHeight: 70 }} value={invites} onChange={(e) => setInvites(e.target.value)} placeholder="coach@example.org, assistant@example.org" /></label>
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn primary lg block">Create club</button>
        </form>
      )}
    </main>
  );
}
