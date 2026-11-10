// Shared helpers and constants.

// What Regattify charges per entry. Not decided yet: set these when pricing is chosen.
export const PLATFORM_FEE = { percent: 0, perEntry: 0 };

export const BOATS = {
  '8+': { seats: 8, cox: true, feeKey: 'eight', label: 'eight' },
  '4+': { seats: 4, cox: true, feeKey: 'four', label: 'four' },
  '4-': { seats: 4, cox: false, feeKey: 'four', label: 'four' },
  '4x': { seats: 4, cox: false, feeKey: 'four', label: 'quad' },
  '2-': { seats: 2, cox: false, feeKey: 'two', label: 'pair' },
  '2x': { seats: 2, cox: false, feeKey: 'two', label: 'double' },
  '1x': { seats: 1, cox: false, feeKey: 'one', label: 'single' },
};
export const BOAT_LIST = Object.keys(BOATS);
export const FEE_LABELS = { eight: 'Eights', four: 'Fours and quads', two: 'Pairs and doubles', one: 'Singles' };
export const CATEGORIES = ['Youth', 'Masters', 'Collegiate', 'Adaptive'];

export const seatCount = (boat) => BOATS[boat].seats + (BOATS[boat].cox ? 1 : 0);

// Seat labels, stern first. Index 0 is the coxswain when the boat has one.
export function seatLabel(boat, i) {
  const b = BOATS[boat];
  if (b.cox && i === 0) return 'Coxswain';
  const n = b.seats - (i - (b.cox ? 1 : 0));
  if (b.seats === 1) return 'Sculler';
  if (n === b.seats) return `Stroke · ${n}`;
  if (n === 1) return 'Bow · 1';
  return `Seat ${n}`;
}
export const isCoxSeat = (boat, i) => BOATS[boat].cox && i === 0;

export function fmtTime(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')}`;
}
export function fmtTimeAmPm(min) {
  if (min == null) return '—';
  return `${fmtTime(min)} ${Math.floor(min / 60) >= 12 ? 'pm' : 'am'}`;
}
export function parseTime(str) {
  const [h, m] = String(str || '').split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
}
export const toInputTime = (min) => min == null ? '' : `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const parseDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtDate = (iso) => { if (!iso) return '—'; const d = parseDate(iso); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };
export const fmtDay = (iso) => { const d = parseDate(iso); return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`; };
export const monShort = (iso) => MONTHS[parseDate(iso).getMonth()].toUpperCase();
export const dayNum = (iso) => parseDate(iso).getDate();
export function fmtRange(a, b) {
  if (!b || a === b) return fmtDay(a);
  const da = parseDate(a), db = parseDate(b);
  if (da.getMonth() === db.getMonth()) return `${MONTHS[da.getMonth()]} ${da.getDate()}–${db.getDate()}`;
  return `${fmtDate(a)} – ${fmtDate(b)}`;
}
export function addDays(iso, n) {
  const d = parseDate(iso); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function daysUntil(iso) {
  const t = parseDate(todayIso()); return Math.round((parseDate(iso) - t) / 86400000);
}
export function untilText(iso) {
  const n = daysUntil(iso);
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} ago`;
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  return `in ${n} days`;
}

export const money = (n) => `$${(Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
export const entryFee = (regatta, event) => Number(event.fee ?? regatta.fees[BOATS[event.boat].feeKey] ?? 0);
export function platformFee(entryFees, count) {
  return Math.round((entryFees * PLATFORM_FEE.percent / 100 + PLATFORM_FEE.perEntry * count) * 100) / 100;
}

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const initials = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
export const plural = (n, word, many) => `${n} ${n === 1 ? word : (many || word + 's')}`;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Racing helpers
export const launchTime = (raceMin) => raceMin == null ? null : raceMin - 40;
export function lane(entryId, lanes) {
  let h = 0; for (const c of entryId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % lanes) + 1;
}
export const dayOfEvent = (regatta, ev) => ev.day === 2 ? regatta.endDate : regatta.startDate;
export const progressionFor = (cap, lanes) => {
  if (cap <= lanes) return 'Straight final';
  const heats = Math.ceil(cap / lanes);
  return heats <= 3 ? `${heats} heats → final` : `${heats} heats → semis → final`;
};
