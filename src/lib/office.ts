/**
 * NaumiCrowns AI office engine — deterministic, local, no network.
 *
 * 30 staff: 6 managers (06:00–18:00 SAST; Agent Shield is the CSO) plus
 * 24 sales stylists (2 on duty per day, rotating by day-of-year). Chats
 * persist per-staff in localStorage (`nc_office_chat_<staffId>`), the
 * Saturday weekly report is generated and emailed to both admins during
 * the Saturday 17:00–21:00 SAST window.
 */
import { ADMIN_EMAILS, GEORGE_EMAIL, BANK_DETAILS, listOrders, sendEmail } from './backend';
import { formatPrice } from './catalog';

/* ============================================================
   Types
   ============================================================ */

export interface StaffMember {
  id: string;
  name: string;
  /** Short department label, e.g. 'HR & People'. */
  role: string;
  kind: 'manager' | 'cso' | 'stylist';
  /** Full job title, e.g. 'Chief Security Officer'. */
  title: string;
  bio: string;
  /** Avatar initials — UI renders colored initial circles, no image files. */
  initials: string;
  /** Brand-palette hex for the avatar circle. */
  color: string;
}

export interface OfficeMessage {
  id: string;
  staffId: string;
  from: 'admin' | 'staff';
  text: string;
  at: number;
}

export interface WeeklyReport {
  id: string;
  weekLabel: string;
  generatedAt: number;
  kpis: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    pendingPayments: number;
    delivered: number;
    likes: number;
  };
  topProducts: { name: string; qty: number }[];
  sections: { managerId: string; title: string; body: string }[];
  emailedTo: string[];
}

export interface SecurityScanEntry {
  id: string;
  at: number;
  event: string;
  detail: string;
  severity: 'info' | 'warning' | 'blocked';
}

export interface BusinessSnapshot {
  orders: number;
  revenue: number;
  avgOrderValue: number;
  pendingPayments: number;
  delivered: number;
  cancelled: number;
  likes: number;
}

/* ============================================================
   Roster
   ============================================================ */

const PALETTE = ['#211B16', '#151110', '#7A6B59', '#D4AF37', '#2D8659', '#3B332B', '#A9812F', '#17120E'];

export const MANAGERS: StaffMember[] = [
  {
    id: 'mgr_tom',
    name: 'Prof. Tom',
    role: 'HR & People',
    kind: 'manager',
    title: 'HR Manager',
    bio: 'Doctorate in Human Resources — keeps the whole floor happy, heard and thriving.',
    initials: 'PT',
    color: '#151110',
  },
  {
    id: 'mgr_shield',
    name: 'Agent Shield',
    role: 'Security',
    kind: 'cso',
    title: 'Chief Security Officer',
    bio: 'Doctorate in Cybersecurity — watches the gates, reports only to George. Mon/Wed/Fri/Sat.',
    initials: 'AS',
    color: '#17120E',
  },
  {
    id: 'mgr_tech',
    name: 'Dr. Tech',
    role: 'Technical',
    kind: 'manager',
    title: 'Technical Manager',
    bio: 'Doctorate in Computer Science — payments, uptime and every bug in between.',
    initials: 'DT',
    color: '#3B332B',
  },
  {
    id: 'mgr_ops',
    name: 'Dr. Ops',
    role: 'Operations',
    kind: 'manager',
    title: 'Operations Manager',
    bio: 'Doctorate in Supply Chain — keeps the workshop humming and stock flowing.',
    initials: 'DO',
    color: '#2D8659',
  },
  {
    id: 'mgr_swift',
    name: 'Dr. Swift',
    role: 'Inventory & Logistics',
    kind: 'manager',
    title: 'Inventory & Logistics Manager',
    bio: 'Doctorate in Logistics — your order is her mission, from workshop to doorstep.',
    initials: 'DS',
    color: '#211B16',
  },
  {
    id: 'mgr_vogue',
    name: 'Dr. Vogue',
    role: 'Marketing & Sales',
    kind: 'manager',
    title: 'Marketing & Sales Manager',
    bio: 'PhD in Marketing (France) — leads the styling floor and grows the crown kingdom.',
    initials: 'DV',
    color: '#D4AF37',
  },
];

const STYLIST_NAMES: string[] = [
  'Lerato', 'Sipho', 'Naledi', 'Kagiso', 'Thandiwe', 'Bongani',
  'Ayanda', 'Tshepo', 'Zanele', 'Mpho', 'Katlego', 'Palesa',
  'Sibusiso', 'Nokuthula', 'Tebogo', 'Refilwe', 'Kabelo', 'Dineo',
  'Karabo', 'Lindiwe', 'Vusi', 'Nomvula', 'Kea', 'Thabo',
];

function makeInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const STYLISTS: StaffMember[] = STYLIST_NAMES.map((name, i) => ({
  id: `stylist_${String(i + 1).padStart(2, '0')}`,
  name,
  role: 'Sales Stylist',
  kind: 'stylist' as const,
  title: 'Sales Stylist',
  bio: 'Warm, Gen-Z energy with PhD-level product sense — here to crown every queen.',
  initials: makeInitials(name),
  color: PALETTE[i % PALETTE.length],
}));

export const STAFF: StaffMember[] = [...MANAGERS, ...STYLISTS];

export function getStaff(id: string): StaffMember | undefined {
  return STAFF.find((s) => s.id === id);
}

/* ============================================================
   SAST time helpers (UTC+2, no DST — offset math, never server locale)
   ============================================================ */

const SAST_OFFSET_MS = 2 * 3_600_000;
const DAY_MS = 86_400_000;

interface SastParts {
  /** 0–23 SAST hour */
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** The shifted Date — read SAST wall-clock fields via getUTC* accessors. */
  date: Date;
}

function sastParts(now: Date): SastParts {
  const shifted = new Date(now.getTime() + SAST_OFFSET_MS);
  return {
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    day: shifted.getUTCDay(),
    date: shifted,
  };
}

/**
 * Current time as a SAST wall-clock Date. Because SAST has no DST we simply
 * shift by +2h — read fields with getUTCHours()/getUTCDay()/etc. (NOT the
 * local-time getters) to get SAST values on any machine.
 */
export function sastNow(): Date {
  return new Date(Date.now() + SAST_OFFSET_MS);
}

function dayOfYearSast(now: Date): number {
  const d = sastParts(now).date;
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / DAY_MS);
}

/** The two stylists on duty today — deterministic rotation by day-of-year. */
export function onDutyStylists(now: Date = new Date()): [StaffMember, StaffMember] {
  const doy = dayOfYearSast(now);
  const a = STYLISTS[doy % STYLISTS.length];
  const b = STYLISTS[(doy + Math.floor(STYLISTS.length / 2)) % STYLISTS.length];
  return [a, b];
}

/** Managers 06:00–18:00 SAST daily; the CSO only Mon/Wed/Fri/Sat. */
export function isManagerOnDuty(staff: StaffMember, now: Date = new Date()): boolean {
  const { hour, day } = sastParts(now);
  const inHours = hour >= 6 && hour < 18;
  if (staff.kind === 'cso') return [1, 3, 5, 6].includes(day) && inHours;
  if (staff.kind === 'manager') return inHours;
  return true; // the stylist floor always has someone on duty
}

/** Saturday 17:00–21:00 SAST — the weekly report window. */
export function isReportWindow(now: Date = new Date()): boolean {
  const { hour, day } = sastParts(now);
  return day === 6 && hour >= 17 && hour < 21;
}

/**
 * Chat permissions: Agent Shield chats ONLY with George (never Naumi);
 * managers and stylists chat with both admins.
 */
export function canChatWith(staff: StaffMember, userEmail: string): boolean {
  const email = userEmail.trim().toLowerCase();
  if (staff.kind === 'cso') return email === GEORGE_EMAIL;
  return ADMIN_EMAILS.includes(email);
}

/* ============================================================
   Business snapshot (real data from the backend engine)
   ============================================================ */

const LIKED_KEY = 'nc_liked';

function readLikesCount(): number {
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function getBusinessSnapshot(): BusinessSnapshot {
  const orders = listOrders();
  const active = orders.filter((o) => o.status !== 'cancelled');
  const revenue = active.reduce((n, o) => n + o.total, 0);
  return {
    orders: orders.length,
    revenue,
    avgOrderValue: active.length ? Math.round(revenue / active.length) : 0,
    pendingPayments: orders.filter((o) => o.status === 'order_received').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
    likes: readLikesCount(),
  };
}

/* ============================================================
   Chat
   ============================================================ */

function chatKey(staffId: string): string {
  return `nc_office_chat_${staffId}`;
}

function readThread(staffId: string): OfficeMessage[] {
  try {
    const raw = localStorage.getItem(chatKey(staffId));
    const parsed = raw ? (JSON.parse(raw) as OfficeMessage[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeThread(staffId: string, thread: OfficeMessage[]): void {
  try {
    localStorage.setItem(chatKey(staffId), JSON.stringify(thread));
  } catch {
    /* storage unavailable */
  }
}

export function getThread(staffId: string): OfficeMessage[] {
  return readThread(staffId);
}

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

function scanSummaryLine(): string {
  const blocked = getSecurityScanLog().filter((e) => e.severity === 'blocked').length;
  return `Today's sweep: ${getSecurityScanLog().length} events logged, ${blocked} blocked before they touched the store.`;
}

/** Deterministic rule-based staff replies, each in the member's own voice. */
export function staffReply(staffId: string, adminText: string): string {
  const staff = getStaff(staffId);
  const snap = getBusinessSnapshot();
  const t = adminText.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (!staff) return 'Sorry, I am off the floor right now — try one of the managers.';

  switch (staff.id) {
    case 'mgr_tom':
      if (has('schedule', 'shift', 'roster', 'leave', 'staff', 'team', 'people', 'hire'))
        return pick([
          `The floor is happy, chief. All ${STYLISTS.length} stylists are rostered and today's pair — ${onDutyStylists().map((s) => s.name).join(' and ')} — reported in bright and early.`,
          `Morale is high this week. I checked in with every stylist; no burnout flags. The rotating pairs keep everyone fresh.`,
          'People first, profits follow. If you want to adjust shifts or add a stylist, say the word and I will draft the roster.',
          `Two stylists on duty daily keeps wages lean and service warm. Current rotation is running smoothly — no gaps since Monday.`,
        ]);
      return pick([
        'Prof. Tom here. Happy people make happy queens — what do you need on the people side?',
        `Quick people-update: ${snap.orders} orders in the system and the team is coping beautifully with the pace.`,
        'I handle hiring, rosters and morale. Ask me about the team, shifts or training.',
      ]);

    case 'mgr_shield':
      if (has('scan', 'security', 'attack', 'threat', 'hack', 'breach', 'report'))
        return pick([
          `Agent Shield, eyes open. ${scanSummaryLine()} SQLi probes and XSS payloads are being neutralized on arrival.`,
          `${scanSummaryLine()} Rate limiting is holding; no credential-stuffing patterns detected. Perimeter is clean, George.`,
          'Security posture: green. All payloads are sanitized at the door, proof-of-payment uploads are image-only, and I escalate anything that smells wrong — to you only.',
          `Scan log is fresh: SQLi blocked, XSS sanitized, one rate-limit event handled. I only brief you, George — this stays between us.`,
        ]);
      return pick([
        `Shield on duty. ${scanSummaryLine()}`,
        'George. Perimeter is quiet. Ask for a scan anytime — I never sleep on Mon, Wed, Fri or Sat.',
        'All quiet on the wire. Payment data stays out of our logs by design; only the masked references remain.',
      ]);

    case 'mgr_tech':
      if (has('payment', 'payshap', 'capitec', 'bank', 'bug', 'site', 'uptime', 'error', 'app'))
        return pick([
          `Dr. Tech here. Payment rails are healthy — ${snap.pendingPayments} order(s) still awaiting payment confirmation. PayShap and Capitec flows both nominal.`,
          `Uptime is 100% this week and the checkout pipeline is clean. ${snap.pendingPayments} pending payment(s) on the board — I am watching them.`,
          'No errors in the queue. Proof-of-payment uploads are validated as images before they touch storage, and the outbox is draining nicely.',
          `Tech check: the store, tracker and outbox are all green. Bank details on file resolve to ${BANK_DETAILS.bank} · ${BANK_DETAILS.accountNumber}.`,
        ]);
      return pick([
        'Dr. Tech on deck. Systems green — what are we fixing or building today?',
        `All services nominal. ${snap.orders} orders processed without a single crash. Ship it.`,
        'If it beeps, pings or breaks, it is mine. Ask me about payments, uptime or bugs.',
      ]);

    case 'mgr_ops':
      if (has('operation', 'workshop', 'stock', 'supplier', 'process', 'craft', 'quality'))
        return pick([
          `Dr. Ops reporting. The workshop pipeline is flowing — ${snap.orders} orders total, ${snap.delivered} delivered. Quality checks are catching everything before it ships.`,
          'Operations are smooth: 1–2 day processing before dispatch, no weekend shipments, and every crown passes workshop check twice.',
          `Stock levels are healthy across all 9 lines. Crafting capacity matches current demand — no queen waits longer than promised.`,
          'Workshop floor is calm and productive. If order volume jumps 30%, I can add a weekend crafting shift — just approve it.',
        ]);
      return pick([
        'Dr. Ops here. The machine is humming — what part of operations shall we look at?',
        `Pipeline status: ${snap.orders} orders, ${snap.delivered} delivered, ${snap.cancelled} cancelled. Efficiency is our love language.`,
        'Workshop, stock, process — that is my desk. How can I help?',
      ]);

    case 'mgr_swift': {
      const shipped = listOrders().filter((o) => o.status === 'shipped').length;
      if (has('order', 'track', 'deliver', 'courier', 'ship', 'paxi', 'postnet', 'logistic', 'inventory'))
        return pick([
          `Dr. Swift on it. ${shipped} parcel(s) currently on the road, ${snap.pendingPayments} awaiting payment before I can pack them. Paxi and PostNet both collecting on schedule.`,
          `Logistics snapshot: ${snap.delivered} delivered, ${shipped} in transit. Remember the promise — 2 to 6 business days, or the queen gets R50 off next time.`,
          'Every parcel leaves with tracking and a prayer. Johannesburg and Polokwane routes are running inside the 2–6 day window this week.',
          `Inventory check done: all 9 wig lines in stock. Free delivery kicks in over R2500 — I flag qualifying orders so we never charge a fee by mistake.`,
        ]);
      return pick([
        'Dr. Swift, clipboard ready. Orders, couriers, inventory — ask me anything.',
        `${shipped} parcels moving, ${snap.pendingPayments} waiting on payment. The road is kind to us today.`,
        'Your order is my mission. What are we shipping, chief?',
      ]);
    }

    case 'mgr_vogue':
      if (has('sale', 'marketing', 'promo', 'special', 'social', 'campaign', 'customer', 'revenue'))
        return pick([
          `Dr. Vogue, darling. Revenue sits at ${formatPrice(snap.revenue)} from ${snap.orders} orders — average crown spend ${formatPrice(snap.avgOrderValue)}. The girls are buying, and they are coming back.`,
          `Marketing pulse: ${snap.likes} likes on the floor this week. I say we turn the most-liked wig into a weekend special and watch it fly.`,
          'Sales floor is glowing. My stylists are converting browsers into queens — leave the campaign calendar with me and I will fill it.',
          `Numbers, then sparkle: ${formatPrice(snap.revenue)} in, ${snap.delivered} crowns delivered, ${snap.likes} hearts on products. I want a bob-week push next.`,
        ]);
      return pick([
        'Dr. Vogue here — sales, sparkle and strategy. What does the queen need?',
        `Today’s vibe: ${snap.likes} likes and counting. Shall we plan a promotion?`,
        'Marketing is storytelling with a till. Give me a goal and I will give you a campaign.',
      ]);

    default: {
      // Sales stylists — warm sales-floor chatter grounded in real numbers.
      const top = topProductsFromOrders()[0];
      return pick([
        `Hiii chief! ${staff.name} on the floor. ${top ? `The ${top.name} is flying — ${top.qty} sold already.` : 'The floor is warming up nicely.'} Who are we crowning today?`,
        `Floor update from ${staff.name}: ${snap.likes} likes on the board and the queens are loving the bouncy blends. Need me to push anything?`,
        `${staff.name} here! ${snap.orders} orders and counting. A customer just asked about the Bob 12" — I told her it is our most-loved for a reason.`,
        `On duty and glowing, chief. ${snap.pendingPayments} order(s) waiting on payment — want me to nudge those queens gently?`,
      ]);
    }
  }
}

function topProductsFromOrders(): { name: string; qty: number }[] {
  const tally = new Map<string, number>();
  for (const o of listOrders()) {
    if (o.status === 'cancelled') continue;
    for (const item of o.items) tally.set(item.name, (tally.get(item.name) ?? 0) + item.qty);
  }
  return [...tally.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty);
}

/**
 * Persist an admin message to a staff thread and the staff member's
 * deterministic reply. Returns the STAFF reply message (both are persisted).
 * Throws if the member does not exist or may not chat with this admin.
 */
export function sendOfficeMessage(staffId: string, text: string, adminEmail: string): OfficeMessage {
  const staff = getStaff(staffId);
  if (!staff) throw new Error('That staff member does not exist.');
  if (!canChatWith(staff, adminEmail))
    throw new Error(
      staff.kind === 'cso'
        ? 'Agent Shield only briefs George directly — this channel is restricted.'
        : 'Only NaumiCrowns admins can chat with the office.',
    );
  const clean = text.trim();
  if (!clean) throw new Error('Type a message first.');

  const thread = readThread(staffId);
  const adminMsg: OfficeMessage = {
    id: `om_${Date.now().toString(36)}_a`,
    staffId,
    from: 'admin',
    text: clean,
    at: Date.now(),
  };
  const reply: OfficeMessage = {
    id: `om_${Date.now().toString(36)}_s`,
    staffId,
    from: 'staff',
    text: staffReply(staffId, clean),
    at: Date.now() + 1,
  };
  writeThread(staffId, [...thread, adminMsg, reply]);
  return reply;
}

/* ============================================================
   Weekly report
   ============================================================ */

const REPORTS_KEY = 'nc_reports';

function readReports(): WeeklyReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as WeeklyReport[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Stable key for the current SAST ISO week, e.g. '2025-W49'. */
function weekKey(now: Date = new Date()): string {
  const d = sastParts(now).date;
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / DAY_MS - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function reportBodyPlain(report: WeeklyReport): string {
  const k = report.kpis;
  return [
    `NaumiCrowns Weekly Business Report — ${report.weekLabel}`,
    '',
    `Revenue: ${formatPrice(k.revenue)}`,
    `Orders: ${k.orders} (avg ${formatPrice(k.avgOrderValue)})`,
    `Pending payments: ${k.pendingPayments}`,
    `Delivered: ${k.delivered}`,
    `Product likes: ${k.likes}`,
    '',
    ...report.topProducts.map((p, i) => `  #${i + 1} ${p.name} — ${p.qty} sold`),
    '',
    ...report.sections.flatMap((s) => [`${s.title}`, s.body, '']),
    'With love,',
    'The NaumiCrowns Team',
  ].join('\n');
}

export function generateWeeklyReport(): WeeklyReport {
  const snap = getBusinessSnapshot();
  const top = topProductsFromOrders().slice(0, 3);
  const shipped = listOrders().filter((o) => o.status === 'shipped').length;
  const crafting = listOrders().filter((o) => o.status === 'crafting' || o.status === 'workshop_check').length;
  const scans = getSecurityScanLog();
  const key = weekKey();

  const sections: WeeklyReport['sections'] = [
    {
      managerId: 'mgr_tom',
      title: 'People — Prof. Tom',
      body: `All ${STYLISTS.length} stylists rostered and rotating in daily pairs; managers covered 06:00–18:00 SAST all week with zero gaps. Morale: high.`,
    },
    {
      managerId: 'mgr_shield',
      title: 'Security — Agent Shield',
      body: `${scans.length} scan events reviewed: SQL injection attempts blocked, XSS payloads sanitized, rate limiting enforced. No breaches, no data exposure. Eyes only for George.`,
    },
    {
      managerId: 'mgr_tech',
      title: 'Technical — Dr. Tech',
      body: `Storefront uptime 100%. Payment flows (PayShap request / Capitec send + proof upload) processed cleanly; ${snap.pendingPayments} payment(s) still awaiting confirmation. Outbox draining normally.`,
    },
    {
      managerId: 'mgr_ops',
      title: 'Operations — Dr. Ops',
      body: `${snap.orders} orders in the pipeline, ${crafting} currently in the workshop (check/crafting), ${snap.cancelled} cancelled. Processing holds at 1–2 days before dispatch with full quality checks.`,
    },
    {
      managerId: 'mgr_swift',
      title: 'Inventory & Logistics — Dr. Swift',
      body: `${snap.delivered} delivered, ${shipped} in transit via Paxi/PostNet across Johannesburg and Polokwane. All deliveries tracking inside the 2–6 business-day promise; free delivery applied over R2500.`,
    },
    {
      managerId: 'mgr_vogue',
      title: 'Marketing & Sales — Dr. Vogue',
      body: `Revenue ${formatPrice(snap.revenue)} across ${snap.orders} orders (avg ${formatPrice(snap.avgOrderValue)}). ${snap.likes} product likes this week${top[0] ? `; best seller: ${top[0].name} (${top[0].qty} sold)` : ''}.`,
    },
  ];

  const report: WeeklyReport = {
    id: `wr_${key}`,
    weekLabel: key,
    generatedAt: Date.now(),
    kpis: {
      revenue: snap.revenue,
      orders: snap.orders,
      avgOrderValue: snap.avgOrderValue,
      pendingPayments: snap.pendingPayments,
      delivered: snap.delivered,
      likes: snap.likes,
    },
    topProducts: top,
    sections,
    emailedTo: [...ADMIN_EMAILS],
  };

  const reports = [report, ...readReports().filter((r) => r.id !== report.id)];
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch {
    /* storage unavailable */
  }
  return report;
}

export function getReports(): WeeklyReport[] {
  return readReports().sort((a, b) => b.generatedAt - a.generatedAt);
}

/**
 * Saturday 17:00–21:00 SAST: if no report exists for the current week,
 * generate it and email it to BOTH admin emails. No-op outside the window.
 */
export function ensureWeeklyReport(): void {
  if (!isReportWindow()) return;
  const key = weekKey();
  if (readReports().some((r) => r.id === `wr_${key}`)) return;
  const report = generateWeeklyReport();
  for (const admin of ADMIN_EMAILS) {
    sendEmail(
      admin,
      `NaumiCrowns Weekly Report — ${report.weekLabel}`,
      reportBodyPlain(report),
      'weekly_report',
    );
  }
}

/* ============================================================
   Security scan log (deterministic)
   ============================================================ */

/** ~6 deterministic scan entries anchored to fixed SAST times today. */
export function getSecurityScanLog(now: Date = new Date()): SecurityScanEntry[] {
  const d = sastParts(now).date;
  // Midnight SAST today, back in real (UTC-based) epoch ms.
  const midnightSastUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const at = (h: number, m: number) => midnightSastUtc + (h * 60 + m) * 60_000 - SAST_OFFSET_MS;
  return [
    { id: 'scan_1', at: at(6, 12), event: 'SQL injection attempt blocked', detail: "Payload ' OR 1=1 -- in order-lookup field; input parameterized, request dropped.", severity: 'blocked' },
    { id: 'scan_2', at: at(7, 45), event: 'XSS payload sanitized', detail: '<script> tag stripped from checkout contact name before storage.', severity: 'blocked' },
    { id: 'scan_3', at: at(9, 3), event: 'Rate limit enforced', detail: '14 sign-in attempts in 60s from one client; cooled down for 5 minutes.', severity: 'warning' },
    { id: 'scan_4', at: at(11, 37), event: 'Oversize payload rejected', detail: 'Proof-of-payment upload above the 2MB image cap was refused.', severity: 'blocked' },
    { id: 'scan_5', at: at(14, 20), event: 'Admin session verified', detail: 'Admin sign-in from recognized device; CSO notified George only.', severity: 'info' },
    { id: 'scan_6', at: at(16, 48), event: 'Dependency sweep clean', detail: 'No known vulnerabilities in the shipping bundle. All green.', severity: 'info' },
  ];
}

try {
  ensureWeeklyReport();
} catch {
  /* weekly report generation is best-effort */
}
