import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { StoreProvider } from './store';
import { Layout, RequireClub, RequireAdmin } from './components/Layout';
import Home from './pages/Home';
import Regattas from './pages/Regattas';
import RegattaPage from './pages/RegattaPage';
import Enter from './pages/Enter';
import Checkout from './pages/Checkout';
import Entries from './pages/Entries';
import Lineups from './pages/Lineups';
import Schedule from './pages/Schedule';
import Club from './pages/Club';
import Signup from './pages/Signup';
import { Hosting, NewRegatta } from './pages/Hosting';
import HostSetup from './pages/HostSetup';
import Organizer from './pages/Organizer';
import Payouts from './pages/Payouts';
import './styles.css';

const coach = (el) => <RequireClub>{el}</RequireClub>;
const admin = (el) => <RequireAdmin>{el}</RequireAdmin>;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={coach(<Home />)} />
            <Route path="regattas" element={<Regattas />} />
            <Route path="r/:id" element={<RegattaPage />} />
            <Route path="r/:id/enter" element={coach(<Enter />)} />
            <Route path="r/:id/checkout" element={coach(<Checkout />)} />
            <Route path="entries" element={coach(<Entries />)} />
            <Route path="lineups" element={coach(<Lineups />)} />
            <Route path="lineups/:regattaId" element={coach(<Lineups />)} />
            <Route path="schedule" element={coach(<Schedule />)} />
            <Route path="schedule/:regattaId" element={coach(<Schedule />)} />
            <Route path="club" element={coach(<Club />)} />
            <Route path="signup" element={<Signup />} />
            <Route path="host" element={admin(<Hosting />)} />
            <Route path="host/new" element={admin(<NewRegatta />)} />
            <Route path="host/:id" element={admin(<Organizer />)} />
            <Route path="host/:id/setup" element={admin(<HostSetup />)} />
            <Route path="host/:id/payouts" element={admin(<Payouts />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  </StrictMode>,
);
