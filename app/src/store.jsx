// The app's data layer. Today it keeps everything in this browser (localStorage).
// When the backend (Supabase) is ready, replace load/save/update with API calls;
// pages only use useStore() and the selectors below.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { makeSeed } from './seed';
import { BOATS, seatCount, entryFee, uid } from './lib';

const KEY = 'regattify-demo-v3';
const StoreCtx = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const db = JSON.parse(raw); if (db && db.version === 3) return db; }
  } catch { /* storage unavailable */ }
  return makeSeed();
}

export function StoreProvider({ children }) {
  const [db, setDb] = useState(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } }, [db]);

  const update = useCallback((fn) => {
    setDb((prev) => { const next = structuredClone(prev); fn(next); return next; });
  }, []);
  const reset = useCallback(() => setDb(makeSeed()), []);

  const value = useMemo(() => ({ db, update, reset }), [db, update, reset]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);

// ---------- selectors ----------
export const getClub = (db, id) => db.clubs.find((c) => c.id === id);
export const myClub = (db) => getClub(db, db.myClubId);
export const getRegatta = (db, id) => db.regattas.find((r) => r.id === id);
export const getEvent = (regatta, id) => regatta?.events.find((e) => e.id === id);
export const clubAthletes = (db, clubId) => db.athletes.filter((a) => a.clubId === clubId);
export const myRole = (db) => {
  const c = myClub(db); if (!c || !db.session) return null;
  return c.members.find((m) => m.email === db.session.email)?.role || null;
};
export const isAdmin = (db) => myRole(db) === 'Admin';

export const entriesFor = (db, regattaId, clubId) =>
  db.entries.filter((e) => e.regattaId === regattaId && (!clubId || e.clubId === clubId));

export function entryInfo(db, entry) {
  const r = getRegatta(db, entry.regattaId);
  const ev = getEvent(r, entry.eventId);
  const filled = entry.seats.filter(Boolean).length;
  return { regatta: r, event: ev, filled, total: entry.seats.length, full: filled === entry.seats.length, fee: entryFee(r, ev) };
}

// Athletes with less than `minGap` minutes between races (same day) across a club's entries.
export function turnaroundIssues(db, regattaId, clubId, minGap = 60) {
  const r = getRegatta(db, regattaId); if (!r) return [];
  const mine = entriesFor(db, regattaId, clubId);
  const byAthlete = {};
  for (const e of mine) {
    const ev = getEvent(r, e.eventId);
    e.seats.forEach((a) => { if (a) (byAthlete[a] ||= []).push({ entry: e, ev }); });
  }
  const issues = [];
  for (const [aid, list] of Object.entries(byAthlete)) {
    const sorted = list.sort((x, y) => (x.ev.day - y.ev.day) || (x.ev.time - y.ev.time));
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1], b = sorted[i];
      if (a.ev.day !== b.ev.day) continue;
      const gap = b.ev.time - a.ev.time;
      if (gap < minGap) issues.push({ athleteId: aid, gap, first: a, second: b, same: gap === 0 });
    }
  }
  return issues;
}

export function regattaStats(db, regattaId) {
  const r = getRegatta(db, regattaId);
  const all = entriesFor(db, regattaId).filter((e) => e.status === 'submitted');
  const clubs = new Set(all.map((e) => e.clubId));
  const pays = db.payments.filter((p) => p.regattaId === regattaId);
  const collected = pays.filter((p) => p.kind === 'payment').reduce((s, p) => s + p.amount, 0);
  const refunded = pays.filter((p) => p.kind === 'refund').reduce((s, p) => s + p.amount, 0);
  const owed = {};
  for (const e of all) { owed[e.clubId] = (owed[e.clubId] || 0) + entryFee(r, getEvent(r, e.eventId)); }
  const paidBy = {};
  for (const p of pays) paidBy[p.clubId] = (paidBy[p.clubId] || 0) + (p.kind === 'refund' ? -p.amount : p.amount);
  const unpaid = Object.keys(owed).filter((c) => (paidBy[c] || 0) + 0.01 < owed[c]);
  const slots = r.events.reduce((s, e) => s + e.cap, 0);
  return { entries: all.length, clubs: clubs.size, collected, refunded, owed, paidBy, unpaid, slots };
}

export const fieldCount = (db, regattaId, eventId) =>
  db.entries.filter((e) => e.regattaId === regattaId && e.eventId === eventId && (e.status === 'submitted' || e.clubId === db.myClubId)).length;

// ---------- mutations used in several places ----------
export function addCrew(d, regattaId, clubId, event) {
  const used = d.entries.filter((e) => e.regattaId === regattaId && e.clubId === clubId && e.eventId === event.id).map((e) => e.crew);
  let letter = 'A'; while (used.includes(letter)) letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  d.entries.push({ id: uid('en'), regattaId, clubId, eventId: event.id, crew: letter, seats: Array(seatCount(event.boat)).fill(null), status: 'draft', paid: false });
}
export function removeCrew(d, regattaId, clubId, eventId) {
  const list = d.entries.filter((e) => e.regattaId === regattaId && e.clubId === clubId && e.eventId === eventId && e.status === 'draft');
  const last = list.sort((a, b) => a.crew.localeCompare(b.crew)).pop();
  if (last) d.entries = d.entries.filter((e) => e.id !== last.id);
}
export function logActivity(d, regattaId, text) {
  d.activity.unshift({ id: uid('ac'), regattaId, text, at: new Date().toISOString().slice(0, 16) });
}
// Heat, lane and race time for an entry once the draw is published.
export function raceSlot(db, r, entry) {
  const ev = getEvent(r, entry.eventId);
  const list = db.entries
    .filter((e) => e.regattaId === r.id && e.eventId === entry.eventId && (e.status === 'submitted' || e.clubId === db.myClubId))
    .sort((a, b) => a.id.localeCompare(b.id));
  const idx = Math.max(0, list.findIndex((e) => e.id === entry.id));
  const lanes = r.format === 'Sprint' ? r.lanes : 999;
  const heat = Math.floor(idx / lanes) + 1;
  const heats = Math.ceil(list.length / lanes);
  return { lane: r.format === 'Sprint' ? (idx % lanes) + 1 : idx + 1, heat, heats, time: ev.time + (heat - 1) * (r.interval || 7) + (r.delayMin || 0), baseTime: ev.time + (heat - 1) * (r.interval || 7) };
}
export const boatOf =(db, entry) => getEvent(getRegatta(db, entry.regattaId), entry.eventId).boat;
export { BOATS };
