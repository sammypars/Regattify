// Demo data. Everything here is made up and lives only in the browser.
import { seatCount, progressionFor } from './lib';

const ev = (id, num, name, cat, boat, day, time, cap) => ({ id, num, name, cat, boat, day, time, cap });

const baseRegatta = {
  status: 'open', lanes: 6, format: 'Sprint', course: '1,500 m', lineupDeadlineHrs: 2, lateEntries: 'no',
  maxCrews: 3, refundPolicy: 'Full refund before the draw', feePaidBy: 'club', waiver: true, memberships: true,
  composite: true, firstRace: 480, lastRace: 1020, interval: 7, turnaround: 45, drawPublished: false, delayMin: 0,
  payoutConnected: true, address: '', parking: '', docks: '', notes: '', contact: '', results: {},
  fees: { eight: 150, four: 100, two: 70, one: 50 },
};

function athletes() {
  const names = [
    ['a1', 'Ethan Brooks'], ['a2', 'Liam Ortiz'], ['a3', 'Noah Kim'], ['a4', 'Mateo Silva'], ['a5', 'Owen Grant'],
    ['a6', 'Caleb Wright'], ['a7', 'Jonah Reyes'], ['a8', 'Isaac Hale'], ['a9', 'Ravi Shah'], ['a10', 'Diego Moreno'],
    ['a11', 'Theo Walsh'], ['a12', 'Sam Adeyemi'], ['a13', 'Jack Turner'], ['a14', 'Ben Okafor'],
    ['a15', 'Priya Nair', true], ['a16', 'Leo Fischer', true], ['a17', 'Ana Lopez', true],
    ['a18', 'Mia Chen'], ['a19', 'Sara Patel'], ['a20', 'Ella Moore'], ['a21', 'Lucia Diaz'], ['a22', 'Grace Young'],
    ['a23', 'Hana Park'], ['a24', 'Zoe Hughes'], ['a25', 'Amira Ali'], ['a26', 'Nora Quinn'], ['a27', 'Ivy Brooks'],
  ];
  return names.map(([id, name, cox]) => ({ id, clubId: 'c1', name, cox: !!cox }));
}

export function makeSeed() {
  const r1Events = [
    ev('r1e3', '3', "Youth Men's 8+ (heat)", 'Youth', '8+', 1, 510, 12),
    ev('r1e14', '14', "Youth Men's 8+", 'Youth', '8+', 1, 580, 18),
    ev('r1e16', '16', "Youth Women's 8+", 'Youth', '8+', 1, 595, 18),
    ev('r1e19', '19', "Youth Men's 4+", 'Youth', '4+', 1, 620, 18),
    ev('r1e22', '22', "Youth Men's 2-", 'Youth', '2-', 1, 650, 12),
    ev('r1e24', '24', "Youth Women's 4x", 'Youth', '4x', 1, 665, 18),
    ev('r1e27', '27', "Youth Men's 1x", 'Youth', '1x', 1, 730, 24),
    ev('r1e31', '31', "Youth Men's 2x", 'Youth', '2x', 1, 785, 18),
    ev('r1e33', '33', "Masters Women's 4x", 'Masters', '4x', 1, 870, 6),
    ev('r1e35', '35', "Masters Men's 8+", 'Masters', '8+', 2, 690, 12),
    ev('r1e36', '36', 'PR3 Mixed 2x', 'Adaptive', '2x', 2, 540, 6),
    ev('r1e38', '38', "Youth Women's 2x", 'Youth', '2x', 2, 560, 18),
    ev('r1e41', '41', 'Youth Mixed 8+', 'Youth', '8+', 2, 640, 12),
  ].filter((e) => e.id !== 'r1e3');
  r1Events.forEach((e) => { e.progression = progressionFor(e.cap, 6); });

  const r3Events = [
    ev('r3e1', '1', "Youth Men's 8+", 'Youth', '8+', 1, 540, 12),
    ev('r3e2', '2', "Youth Women's 8+", 'Youth', '8+', 1, 555, 12),
    ev('r3e3', '3', "Youth Men's 4+", 'Youth', '4+', 1, 600, 18),
    ev('r3e4', '4', "Youth Women's 4x", 'Youth', '4x', 1, 615, 18),
    ev('r3e5', '5', "Youth Men's 1x", 'Youth', '1x', 1, 690, 12),
    ev('r3e6', '6', "Masters Women's 4x", 'Masters', '4x', 1, 750, 6),
  ];
  r3Events.forEach((e) => { e.progression = progressionFor(e.cap, 6); });

  const r2Events = [
    ev('r2e1', '1', "Youth Men's 8+ (head)", 'Youth', '8+', 1, 540, 30),
    ev('r2e2', '2', "Youth Women's 8+ (head)", 'Youth', '8+', 1, 560, 30),
    ev('r2e3', '3', "Youth Men's 4+ (head)", 'Youth', '4+', 1, 600, 30),
  ];
  r2Events.forEach((e) => { e.progression = 'Timed, one race'; });

  const regattas = [
    { ...baseRegatta, id: 'r1', name: 'Fall Harbor Regatta', hostClubId: 'c2', startDate: '2026-11-14', endDate: '2026-11-15',
      venue: 'Harbor Lake', entriesOpen: '2026-10-01', entriesClose: '2026-11-10', events: r1Events, drawPublished: true, delayMin: 10,
      parking: 'Lot B, row 3', docks: 'Launch from North dock, land at South dock', notes: 'Warm up upstream, stay to starboard.', contact: 'regatta@example.org' },
    { ...baseRegatta, id: 'r2', name: 'Turkey Trot Head Race', hostClubId: 'c4', startDate: '2026-11-22', endDate: '2026-11-22',
      venue: 'Mill River', format: 'Head race', course: '4,800 m', entriesOpen: '2026-10-10', entriesClose: '2026-11-18', events: r2Events,
      drawPublished: true, fees: { eight: 120, four: 80, two: 55, one: 40 }, contact: 'head@example.org' },
    { ...baseRegatta, id: 'r3', name: 'Riverside Winter Sprints', hostClubId: 'c1', startDate: '2026-12-05', endDate: '2026-12-05',
      venue: 'Riverside Basin', entriesOpen: '2026-11-01', entriesClose: '2026-11-28', events: r3Events, contact: 'patel@example.org',
      parking: 'Boathouse lot', docks: 'Main dock', notes: '' },
    { ...baseRegatta, id: 'r4', name: 'Spring Sprints Invitational', hostClubId: 'c3', startDate: '2027-03-28', endDate: '2027-03-28',
      venue: 'Lake Calder', entriesOpen: '2027-02-01', entriesClose: '2027-03-20', events: r1Events.slice(0, 6).map((e) => ({ ...e, id: e.id.replace('r1', 'r4') })) },
  ];

  const seats = (boat, list) => { const s = Array(seatCount(boat)).fill(null); list.forEach((v, i) => { s[i] = v; }); return s; };
  const entries = [
    { id: 'en1', regattaId: 'r1', clubId: 'c1', eventId: 'r1e14', crew: 'A', seats: seats('8+', ['a15', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8']) },
    { id: 'en2', regattaId: 'r1', clubId: 'c1', eventId: 'r1e14', crew: 'B', seats: seats('8+', [null, 'a14', 'a13', 'a11', 'a10']) },
    { id: 'en3', regattaId: 'r1', clubId: 'c1', eventId: 'r1e16', crew: 'A', seats: seats('8+', ['a17', 'a18', 'a19', 'a20', 'a21', 'a22', 'a23', 'a24', 'a25']) },
    { id: 'en4', regattaId: 'r1', clubId: 'c1', eventId: 'r1e19', crew: 'A', seats: seats('4+', ['a16', 'a1', 'a9', 'a12']) },
    { id: 'en5', regattaId: 'r1', clubId: 'c1', eventId: 'r1e24', crew: 'A', seats: seats('4x', ['a18', 'a20', 'a23', 'a25']) },
    { id: 'en6', regattaId: 'r1', clubId: 'c1', eventId: 'r1e24', crew: 'B', seats: seats('4x', []) },
    { id: 'en7', regattaId: 'r1', clubId: 'c1', eventId: 'r1e31', crew: 'A', seats: seats('2x', ['a9', 'a12']) },
    { id: 'en8', regattaId: 'r1', clubId: 'c1', eventId: 'r1e41', crew: 'A', seats: seats('8+', ['a17', 'a26', 'a27', 'a3', 'a4', 'a5', null, 'a22']) },
    { id: 'en9', regattaId: 'r2', clubId: 'c1', eventId: 'r2e1', crew: 'A', seats: seats('8+', ['a15', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8']), status: 'submitted', paid: true },
    { id: 'en10', regattaId: 'r2', clubId: 'c1', eventId: 'r2e2', crew: 'A', seats: seats('8+', ['a17', 'a18', 'a19', 'a20', 'a21', 'a22', 'a23', 'a24', 'a25']), status: 'submitted', paid: true },
  ].map((e) => ({ status: 'draft', paid: false, ...e }));

  // Other clubs' entries so fields look real.
  const others = ['c2', 'c3', 'c4', 'c5', 'c6'];
  let n = 100;
  for (const r of regattas) {
    if (r.id === 'r4') continue;
    r.events.forEach((e, i) => {
      const count = Math.min(e.cap - 1, 3 + ((i * 5 + r.id.length * 3) % (e.cap - 2)));
      for (let k = 0; k < count; k++) {
        const clubId = others[(i + k) % others.length];
        entries.push({ id: `en${n++}`, regattaId: r.id, clubId, eventId: e.id, crew: String.fromCharCode(65 + Math.floor(k / others.length)),
          seats: Array(seatCount(e.boat)).fill(null), status: 'submitted', paid: !(r.id === 'r3' && clubId === 'c5') });
      }
    });
  }

  const payments = [];
  for (const r of regattas) {
    for (const c of others) {
      const mine = entries.filter((x) => x.regattaId === r.id && x.clubId === c && x.paid);
      if (!mine.length) continue;
      const amount = mine.reduce((s, x) => s + Number(r.fees[{ '8+': 'eight', '4+': 'four', '4x': 'four', '4-': 'four', '2x': 'two', '2-': 'two', '1x': 'one' }[r.events.find((e) => e.id === x.eventId).boat]]), 0);
      payments.push({ id: `p_${r.id}_${c}`, regattaId: r.id, clubId: c, amount, method: c === 'c3' ? 'Bank' : 'Card', date: '2026-11-0' + (others.indexOf(c) + 3), kind: 'payment' });
    }
  }
  payments.push({ id: 'p_r2_c1', regattaId: 'r2', clubId: 'c1', amount: 240, method: 'Card', date: '2026-11-04', kind: 'payment' });

  return {
    version: 3,
    session: { name: 'Priya Patel', email: 'patel@example.org' },
    myClubId: 'c1',
    clubs: [
      { id: 'c1', name: 'Riverside Rowing Club', short: 'RRC', city: 'Riverside', color: '#F2A33A',
        members: [
          { email: 'patel@example.org', name: 'Priya Patel', role: 'Admin', status: 'Active' },
          { email: 'mlee@example.org', name: 'Marcus Lee', role: 'Coach', status: 'Active' },
          { email: 'dortiz@example.org', name: '', role: 'Coach', status: 'Invited' },
        ],
        requests: [{ email: 'srivera@example.org', name: 'Sam Rivera', date: '2026-11-07' }] },
      { id: 'c2', name: 'Harbor City Rowing Association', short: 'HCRA', city: 'Harbor City', color: '#1F4FD8', members: [], requests: [] },
      { id: 'c3', name: 'Calder Rowing', short: 'CAL', city: 'Calder', color: '#12724A', members: [], requests: [] },
      { id: 'c4', name: 'Mill River Boat Club', short: 'MRBC', city: 'Millbrook', color: '#B42318', members: [], requests: [] },
      { id: 'c5', name: 'Lakeside Crew', short: 'LSC', city: 'Lakeside', color: '#6D28D9', members: [], requests: [] },
      { id: 'c6', name: 'Northgate Juniors', short: 'NGJ', city: 'Northgate', color: '#0E1726', members: [], requests: [] },
    ],
    athletes: athletes(),
    regattas,
    entries,
    payments,
    requests: [
      { id: 'q1', regattaId: 'r3', clubId: 'c5', type: 'Late entry', detail: "Youth Women's 4x · field has room", eventId: 'r3e4', status: 'open' },
      { id: 'q2', regattaId: 'r3', clubId: 'c4', type: 'Scratch', detail: "Youth Men's 4+ · before the draw, so refunded", eventId: 'r3e3', status: 'open' },
      { id: 'q3', regattaId: 'r3', clubId: 'c3', type: 'Lineup change', detail: "Youth Men's 8+ · seat 3 swap (injury)", eventId: 'r3e1', status: 'open' },
    ],
    activity: [
      { id: 'ac1', regattaId: 'r3', text: 'Calder Rowing entered 4 crews and paid', at: '2026-11-08T15:10' },
      { id: 'ac2', regattaId: 'r3', text: 'Harbor City RA added a crew to Masters Women’s 4x', at: '2026-11-08T13:42' },
      { id: 'ac3', regattaId: 'r3', text: 'Lakeside Crew asked for a late entry', at: '2026-11-08T11:05' },
    ],
  };
}
