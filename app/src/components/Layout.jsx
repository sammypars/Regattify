import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore, myClub, isAdmin } from '../store';
import { Logo, ClubBadge, Icon } from './ui';

export function Layout() {
  const { db, reset } = useStore();
  const club = myClub(db);
  const admin = isAdmin(db);
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const signedIn = !!(db.session && club);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-in">
          <Link to="/" className="brand"><Logo />Regattify</Link>
          {signedIn ? (
            <nav className="nav" aria-label="Main">
              <NavLink to="/" end>Home</NavLink>
              <NavLink to="/regattas">Regattas</NavLink>
              <NavLink to="/entries">Entries</NavLink>
              <NavLink to="/lineups">Lineups</NavLink>
              <NavLink to="/schedule">Schedule</NavLink>
              <NavLink to="/club">Club</NavLink>
              {admin && <NavLink to="/host">Hosting</NavLink>}
            </nav>
          ) : <span className="grow" />}
          {signedIn ? (
            <Link to="/club" className="clubchip" aria-label="Club settings">
              <ClubBadge club={club} />
              <span className="t">{club.name}<span>{db.session.name} · {admin ? 'Admin' : 'Coach'}</span></span>
            </Link>
          ) : (
            <Link to="/signup" className="btn sm">Sign in</Link>
          )}
        </div>
      </header>
      <div className="demo">
        <div className="demo-in">
          <span><strong>Demo:</strong> everything you change is saved in this browser only, until the backend is connected.</span>
          <button type="button" onClick={() => { if (confirm('Reset all demo data back to the start?')) reset(); }}>Reset demo data</button>
        </div>
      </div>
      <Outlet />
      {signedIn && (
        <nav className="tabbar" aria-label="App">
          <NavLink to="/" end><Icon name="home" size={22} />Home</NavLink>
          <NavLink to="/regattas"><Icon name="flag" size={22} />Regattas</NavLink>
          <NavLink to="/entries"><Icon name="list" size={22} />Entries</NavLink>
          <NavLink to="/schedule"><Icon name="cal" size={22} />Schedule</NavLink>
          <NavLink to="/club"><Icon name="club" size={22} />Club</NavLink>
        </nav>
      )}
    </div>
  );
}

export function RequireClub({ children }) {
  const { db } = useStore();
  if (!db.session || !myClub(db)) return <Navigate to="/signup" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { db } = useStore();
  if (!db.session || !myClub(db)) return <Navigate to="/signup" replace />;
  if (!isAdmin(db)) return <div className="page narrow"><div className="callout warn">Only club admins can host regattas. Ask an admin at your club to give you access.</div></div>;
  return children;
}

export function BackLink({ to, children }) {
  return <Link to={to} className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="back" size={16} />{children}</Link>;
}
