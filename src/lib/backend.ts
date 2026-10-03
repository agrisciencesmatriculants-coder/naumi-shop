/**
 * NaumiCrowns local backend engine — auth, orders, settings, email outbox.
 *
 * The app ships frontend-only, so this module is a self-contained
 * localStorage-backed engine. All storage keys are prefixed `nc_` and every
 * access is guarded so the module is safe to import in any environment
 * (including SSR-style shells where `localStorage` is undefined).
 *
 * Framework-pure except the two React hooks (`useCurrentUser`, `useOrders`).
 */
import { useSyncExternalStore } from 'react';
import { COURIERS, FREE_DELIVERY_THRESHOLD, formatPrice, getProduct } from './catalog';
import { SITE } from './site';

/* ============================================================
   Locked business facts
   ============================================================ */

export const ADMIN_EMAILS: string[] = [...SITE.adminEmails];
export const GEORGE_EMAIL = SITE.adminEmails[0];
export const NAOMI_EMAIL = SITE.adminEmails[1];

/** Owner-authorized banking details for PayShap / Capitec cellphone pay. */
export const BANK_DETAILS = {
  bank: 'Capitec',
  accountName: 'MR Ragedi NG',
  accountNumber: '2081845985',
  branchCode: '470010',
  payshapNumber: '0631917709',
} as const;

/** Locked copy — the late-delivery promise. */
export const LATE_PROMISE_NOTE =
  'Delivery took more than 6 business working days — you get R50 off your next purchase, guaranteed.';

export const DELIVERY_CITIES = ['Johannesburg', 'Polokwane'] as const;
export type DeliveryCity = (typeof DELIVERY_CITIES)[number];

/* ============================================================
   Types
   ============================================================ */

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isAdmin: boolean;
  /** Shown once at signup; the customer keeps it safe for account recovery. */
  recoveryCode: string;
  createdAt: number;
}

export type OrderStatus =
  | 'order_received'
  | 'payment_confirmed'
  | 'workshop_check'
  | 'crafting'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface StatusEntry {
  status: OrderStatus;
  at: number;
  note?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  city: DeliveryCity;
  courier: 'paxi' | 'postnet';
  deliveryPoint: string;
  contact: { name: string; email: string; phone: string };
  paymentMethod: 'payshap' | 'capitec';
  paymentMode: 'request' | 'send';
  /** PayShap ID / Capitec cellphone number (request mode) or customer reference (send mode). */
  paymentRef?: string;
  /** Proof-of-payment image as a dataURL (send mode). */
  proofOfPayment?: string;
  status: OrderStatus;
  statusHistory: StatusEntry[];
  createdAt: number;
  updatedAt: number;
  latePromiseNote?: string;
}

export type EmailKind = 'order_confirmation' | 'payment' | 'weekly_report' | 'status_update';

export interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  body: string;
  at: number;
  kind: EmailKind;
}

export interface CreateOrderInput {
  userId: string;
  /** Catalog product ids + quantities — prices are locked in from the catalog. */
  items: { id: string; qty: number }[];
  city: DeliveryCity;
  courier: 'paxi' | 'postnet';
  deliveryPoint: string;
  contact: { name: string; email: string; phone: string };
  paymentMethod: 'payshap' | 'capitec';
  paymentMode: 'request' | 'send';
  paymentRef?: string;
}

export interface FeeSettings {
  paxiFee: number;
  postnetFee: number;
}

/* ============================================================
   Status metadata
   ============================================================ */

const STATUS_FLOW: OrderStatus[] = [
  'order_received',
  'payment_confirmed',
  'workshop_check',
  'crafting',
  'shipped',
  'delivered',
];

export const STATUS_STEPS: { id: OrderStatus; label: string; icon: string }[] = [
  { id: 'order_received', label: 'Order Received', icon: 'receipt_long' },
  { id: 'payment_confirmed', label: 'Payment Confirmed', icon: 'payments' },
  { id: 'workshop_check', label: 'Workshop Check', icon: 'fact_check' },
  { id: 'crafting', label: 'Crafting', icon: 'content_cut' },
  { id: 'shipped', label: 'Shipped', icon: 'local_shipping' },
  { id: 'delivered', label: 'Delivered', icon: 'celebration' },
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  order_received: 'Order Received',
  payment_confirmed: 'Payment Confirmed',
  workshop_check: 'Workshop Check',
  crafting: 'Crafting',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Next status in the linear lifecycle; null for delivered/cancelled. */
export function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}

/* ============================================================
   Storage helpers (SSR-safe)
   ============================================================ */

const USERS_KEY = 'nc_users';
const SESSION_KEY = 'nc_session';
const ORDERS_KEY = 'nc_orders';
const OUTBOX_KEY = 'nc_outbox';
const SETTINGS_KEY = 'nc_settings';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Returns false when persistence fails (quota/private mode) so callers can surface it. */
function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ============================================================
   Auth
   ============================================================ */

interface StoredUser extends User {
  passwordHash: string;
}

/** FNV-1a 32-bit hex — simple non-reversible hash; passwords never stored plaintext. */
function hashPassword(password: string): string {
  const input = `naumicrowns:${password}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** ≥8 chars with at least one uppercase, one lowercase and one digit. */
export function isPasswordStrong(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

/** 8-char uppercase-alnum recovery code (shown once at signup). */
export function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

let usersCache: StoredUser[] = readJSON<StoredUser[]>(USERS_KEY, []);
let sessionUserId: string | null = readJSON<string | null>(SESSION_KEY, null);

function toPublicUser(u: StoredUser): User {
  const { passwordHash: _passwordHash, ...pub } = u;
  return pub;
}

function computeCurrentUser(): User | null {
  if (!sessionUserId) return null;
  const found = usersCache.find((u) => u.id === sessionUserId);
  return found ? toPublicUser(found) : null;
}

let currentUserCache: User | null = computeCurrentUser();

const authListeners = new Set<() => void>();

function persistUsers(): void {
  writeJSON(USERS_KEY, usersCache);
  currentUserCache = computeCurrentUser();
  authListeners.forEach((cb) => cb());
}

function setSession(userId: string | null): void {
  sessionUserId = userId;
  writeJSON(SESSION_KEY, sessionUserId);
  currentUserCache = computeCurrentUser();
  authListeners.forEach((cb) => cb());
}

export function subscribeAuth(cb: () => void): () => void {
  authListeners.add(cb);
  return () => {
    authListeners.delete(cb);
  };
}

export function signUp(name: string, email: string, password: string, phone?: string): User {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanName) throw new Error('Please tell us your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
    throw new Error('Please enter a valid email address.');
  if (!isPasswordStrong(password))
    throw new Error(
      'Password must be at least 8 characters with an uppercase letter, a lowercase letter and a number.',
    );
  if (usersCache.some((u) => u.email === cleanEmail))
    throw new Error('An account with this email already exists — try signing in instead.');

  const user: StoredUser = {
    id: uid('user'),
    name: cleanName,
    email: cleanEmail,
    phone: phone?.trim() || undefined,
    isAdmin: isAdminEmail(cleanEmail),
    recoveryCode: generateRecoveryCode(),
    createdAt: Date.now(),
    passwordHash: hashPassword(password),
  };
  usersCache = [...usersCache, user];
  persistUsers();
  setSession(user.id);
  return toPublicUser(user);
}

export function signIn(email: string, password: string): User {
  const cleanEmail = email.trim().toLowerCase();
  const found = usersCache.find((u) => u.email === cleanEmail);
  if (!found) throw new Error('No account found with this email — sign up first.');
  if (found.passwordHash !== hashPassword(password))
    throw new Error('Incorrect password. Please try again.');
  // Keep the admin flag in sync with the locked admin email list.
  const shouldBeAdmin = isAdminEmail(cleanEmail);
  if (found.isAdmin !== shouldBeAdmin) {
    usersCache = usersCache.map((u) => (u.id === found.id ? { ...u, isAdmin: shouldBeAdmin } : u));
    persistUsers();
  }
  setSession(found.id);
  return toPublicUser({ ...found, isAdmin: shouldBeAdmin });
}

export function signOut(): void {
  setSession(null);
}

export function getCurrentUser(): User | null {
  return currentUserCache;
}

/** React hook — re-renders whenever auth state changes. */
export function useCurrentUser(): User | null {
  return useSyncExternalStore(subscribeAuth, getCurrentUser, () => null);
}

/* ============================================================
   Settings (admin-editable courier fees)
   ============================================================ */

const DEFAULT_SETTINGS: FeeSettings = { paxiFee: COURIERS.paxi.fee, postnetFee: COURIERS.postnet.fee };

let settingsCache: FeeSettings = { ...DEFAULT_SETTINGS, ...readJSON<Partial<FeeSettings>>(SETTINGS_KEY, {}) };

const settingsListeners = new Set<() => void>();

export function getSettings(): FeeSettings {
  return { ...settingsCache };
}

export function setSettings(patch: Partial<FeeSettings>): FeeSettings {
  settingsCache = {
    paxiFee: Math.max(0, Math.round(patch.paxiFee ?? settingsCache.paxiFee)),
    postnetFee: Math.max(0, Math.round(patch.postnetFee ?? settingsCache.postnetFee)),
  };
  writeJSON(SETTINGS_KEY, settingsCache);
  settingsListeners.forEach((cb) => cb());
  return getSettings();
}

export function subscribeSettings(cb: () => void): () => void {
  settingsListeners.add(cb);
  return () => {
    settingsListeners.delete(cb);
  };
}

/* ============================================================
   Email outbox (simulated send)
   ============================================================ */

let outboxCache: EmailMessage[] = readJSON<EmailMessage[]>(OUTBOX_KEY, []);

const outboxListeners = new Set<() => void>();

export function sendEmail(to: string, subject: string, body: string, kind: EmailKind): EmailMessage {
  const msg: EmailMessage = { id: uid('em'), to, subject, body, at: Date.now(), kind };
  outboxCache = [msg, ...outboxCache];
  writeJSON(OUTBOX_KEY, outboxCache);
  outboxListeners.forEach((cb) => cb());
  return msg;
}

export function listOutbox(): EmailMessage[] {
  return [...outboxCache];
}

export function subscribeOutbox(cb: () => void): () => void {
  outboxListeners.add(cb);
  return () => {
    outboxListeners.delete(cb);
  };
}

const SIGN_OFF = 'With love,\nThe NaumiCrowns Team';

function bankDetailsBlock(): string {
  return [
    `Bank: ${BANK_DETAILS.bank}`,
    `Account Name: ${BANK_DETAILS.accountName}`,
    `Account Number: ${BANK_DETAILS.accountNumber}`,
    `Branch Code: ${BANK_DETAILS.branchCode}`,
    `PayShap Number: ${BANK_DETAILS.payshapNumber}`,
  ].join('\n');
}

function orderLinesBlock(order: Order): string {
  const lines = order.items.map(
    (i) => `  • ${i.name} x${i.qty} — ${formatPrice(i.price * i.qty)}`,
  );
  return [
    ...lines,
    `  Subtotal: ${formatPrice(order.subtotal)}`,
    `  Delivery (${COURIERS[order.courier].name}, ${order.city}): ${
      order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee)
    }`,
    `  Total: ${formatPrice(order.total)}`,
  ].join('\n');
}

function orderConfirmationBody(order: Order): string {
  const paymentBlock =
    order.paymentMode === 'request'
      ? [
          `We have sent a payment request of ${formatPrice(order.total)} to your ${
            order.paymentMethod === 'payshap' ? 'PayShap ID' : 'Capitec cellphone number'
          }${order.paymentRef ? ` (${order.paymentRef})` : ''}.`,
          'Simply approve it in your banking app and we will start crafting your crown.',
        ].join('\n')
      : [
          `Please send ${formatPrice(order.total)} via PayShap or Capitec cellphone pay to:`,
          bankDetailsBlock(),
          `Use your order number ${order.id} as reference, then upload your proof of payment on the payment page.`,
        ].join('\n');
  return [
    `Hi ${order.contact.name},`,
    '',
    `Thank you for your order! Every crown tells a story — and yours just began.`,
    '',
    `Order: ${order.id}`,
    orderLinesBlock(order),
    '',
    paymentBlock,
    '',
    'Delivery takes 2 to 6 business working days. If it takes more than 6 days, you get R50 off your next purchase — guaranteed.',
    '',
    SIGN_OFF,
  ].join('\n');
}

function adminNotificationBody(order: Order): string {
  return [
    `New order ${order.id} just came in.`,
    '',
    `Customer: ${order.contact.name} (${order.contact.email}, ${order.contact.phone})`,
    `Delivery: ${COURIERS[order.courier].name} — ${order.city} (${order.deliveryPoint})`,
    `Payment: ${order.paymentMethod} / ${order.paymentMode}${order.paymentRef ? ` — ${order.paymentRef}` : ''}`,
    '',
    orderLinesBlock(order),
    '',
    SIGN_OFF,
  ].join('\n');
}

function statusUpdateBody(order: Order, note?: string): string {
  return [
    `Hi ${order.contact.name},`,
    '',
    `Good news from the workshop! Your order ${order.id} is now: ${STATUS_LABELS[order.status]}.`,
    note ? `\n${note}` : '',
    order.latePromiseNote ? `\n${order.latePromiseNote}` : '',
    '',
    'You can follow every step live on the Track Order page.',
    '',
    SIGN_OFF,
  ].join('\n');
}

function paymentConfirmedBody(order: Order): string {
  return [
    `Hi ${order.contact.name},`,
    '',
    `Payment received — thank you! Your order ${order.id} (${formatPrice(order.total)}) is confirmed`,
    'and your crown is moving into our workshop for its quality check.',
    '',
    'Delivery takes 2 to 6 business working days. If it takes more than 6 days, you get R50 off your next purchase — guaranteed.',
    '',
    SIGN_OFF,
  ].join('\n');
}

/* ============================================================
   Orders
   ============================================================ */

function sortNewestFirst(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => b.createdAt - a.createdAt);
}

let ordersCache: Order[] = sortNewestFirst(readJSON<Order[]>(ORDERS_KEY, []));

const orderListeners = new Set<() => void>();

function persistOrders(): boolean {
  const ok = writeJSON(ORDERS_KEY, ordersCache);
  orderListeners.forEach((cb) => cb());
  return ok;
}

/** Order id: `NC-` + 6 uppercase alphanumeric chars, unique among existing orders. */
export function generateOrderId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  do {
    id = 'NC-';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  } while (ordersCache.some((o) => o.id === id));
  return id;
}

/** Delivery fee with settings overrides + the free-over-R2500 rule. */
export function computeDeliveryFee(subtotal: number, courier: 'paxi' | 'postnet'): number {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  const s = getSettings();
  return courier === 'paxi' ? s.paxiFee : s.postnetFee;
}

export function createOrder(input: CreateOrderInput): Order {
  if (!input.items.length) throw new Error('Your crown bag is empty — add a wig first.');
  if (!DELIVERY_CITIES.includes(input.city))
    throw new Error('We currently deliver to Johannesburg and Polokwane only.');

  // Price lock: snapshot name/price/image from the catalog at order time.
  const items: OrderItem[] = input.items.map(({ id, qty }) => {
    const p = getProduct(id);
    if (!p) throw new Error(`Unknown product "${id}".`);
    return { id: p.id, name: p.name, price: p.price, image: p.image, qty: Math.max(1, Math.floor(qty)) };
  });

  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const deliveryFee = computeDeliveryFee(subtotal, input.courier);
  const now = Date.now();

  const order: Order = {
    id: generateOrderId(),
    userId: input.userId,
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    city: input.city,
    courier: input.courier,
    deliveryPoint: input.deliveryPoint.trim(),
    contact: {
      name: input.contact.name.trim(),
      email: input.contact.email.trim().toLowerCase(),
      phone: input.contact.phone.trim(),
    },
    paymentMethod: input.paymentMethod,
    paymentMode: input.paymentMode,
    paymentRef: input.paymentRef?.trim() || undefined,
    status: 'order_received',
    statusHistory: [{ status: 'order_received', at: now, note: 'Order placed' }],
    createdAt: now,
    updatedAt: now,
  };

  ordersCache = sortNewestFirst([order, ...ordersCache]);
  persistOrders();

  sendEmail(
    order.contact.email,
    `Your NaumiCrowns order ${order.id} is received`,
    orderConfirmationBody(order),
    'order_confirmation',
  );
  for (const admin of ADMIN_EMAILS) {
    sendEmail(
      admin,
      `New order ${order.id} — ${formatPrice(order.total)} (${order.city})`,
      adminNotificationBody(order),
      'order_confirmation',
    );
  }
  return order;
}

export function getOrder(id: string): Order | null {
  return ordersCache.find((o) => o.id === id) ?? null;
}

export function listOrders(): Order[] {
  // MUST return the cached reference: useSyncExternalStore requires a stable
  // snapshot. Every mutation replaces `ordersCache` with a new sorted array,
  // so change notification still works — while a fresh `[...cache]` per call
  // would loop React into "maximum update depth exceeded".
  return ordersCache;
}

export function listOrdersForUser(userId: string): Order[] {
  return ordersCache.filter((o) => o.userId === userId);
}

/** Business working days (Mon–Fri) between two timestamps. */
function businessDaysBetween(from: number, to: number): number {
  if (to <= from) return 0;
  let count = 0;
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  const end = new Date(to);
  while (day.getTime() < end.getTime()) {
    day.setDate(day.getDate() + 1);
    const dow = day.getDay();
    if (dow !== 0 && dow !== 6 && day.getTime() <= end.getTime()) count++;
  }
  return count;
}

function mutateOrder(id: string, mutate: (order: Order) => Order): Order {
  const existing = ordersCache.find((o) => o.id === id);
  if (!existing) throw new Error(`Order ${id} not found.`);
  const updated = { ...mutate(existing), updatedAt: Date.now() };
  ordersCache = sortNewestFirst(ordersCache.map((o) => (o.id === id ? updated : o)));
  persistOrders();
  return updated;
}

export function updateOrderStatus(id: string, status: OrderStatus, note?: string): Order {
  const updated = mutateOrder(id, (order) => {
    const next: Order = {
      ...order,
      status,
      statusHistory: [...order.statusHistory, { status, at: Date.now(), ...(note ? { note } : {}) }],
    };
    // Late promise: delivered more than 6 business working days after ordering.
    if (status === 'delivered' && businessDaysBetween(order.createdAt, Date.now()) > 6) {
      next.latePromiseNote = LATE_PROMISE_NOTE;
    }
    return next;
  });
  sendEmail(
    updated.contact.email,
    `Order ${updated.id}: ${STATUS_LABELS[status]}`,
    statusUpdateBody(updated, note),
    'status_update',
  );
  return updated;
}

export function attachProofOfPayment(id: string, dataUrl: string): Order {
  if (!dataUrl.startsWith('data:image/'))
    throw new Error('Please upload an image of your proof of payment.');
  const updated = mutateOrder(id, (order) => ({ ...order, proofOfPayment: dataUrl }));
  // Never claim a proof we couldn't keep — surface quota failures and roll back.
  if (!writeJSON(ORDERS_KEY, ordersCache)) {
    mutateOrder(id, (order) => {
      const { proofOfPayment: _dropped, ...rest } = order;
      return rest;
    });
    throw new Error(
      'Could not save the proof on this device (storage full) — please send it to us on WhatsApp instead.',
    );
  }
  return updated;
}

export function confirmPayment(id: string): Order {
  const updated = mutateOrder(id, (order) => ({
    ...order,
    status: 'payment_confirmed' as OrderStatus,
    statusHistory: [
      ...order.statusHistory,
      { status: 'payment_confirmed' as OrderStatus, at: Date.now(), note: 'Payment confirmed' },
    ],
  }));
  sendEmail(
    updated.contact.email,
    `Payment confirmed for order ${updated.id}`,
    paymentConfirmedBody(updated),
    'payment',
  );
  return updated;
}

export function subscribeOrders(cb: () => void): () => void {
  orderListeners.add(cb);
  return () => {
    orderListeners.delete(cb);
  };
}

/** React hook — all orders, newest first, live-updating. */
export function useOrders(): Order[] {
  return useSyncExternalStore(subscribeOrders, listOrders, () => []);
}

/* ============================================================
   Formatting
   ============================================================ */

/** Format a timestamp in SAST using en-ZA conventions. */
export function formatDateTime(ts: number): string {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ts));
}

/* ============================================================
   Demo data (idempotent — only seeds when no orders exist)
   ============================================================ */

function seedDemoUser(name: string, email: string, phone: string): StoredUser {
  const existing = usersCache.find((u) => u.email === email);
  if (existing) return existing;
  const user: StoredUser = {
    id: uid('user'),
    name,
    email,
    phone,
    isAdmin: false,
    recoveryCode: generateRecoveryCode(),
    createdAt: Date.now() - 30 * 86_400_000,
    passwordHash: hashPassword('Password1'),
  };
  usersCache = [...usersCache, user];
  persistUsers();
  return user;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function demoOrder(
  user: StoredUser,
  productIds: [string, number][],
  city: DeliveryCity,
  courier: 'paxi' | 'postnet',
  targetStatus: OrderStatus,
  daysAgo: number,
  paymentMode: 'request' | 'send',
  paymentMethod: 'payshap' | 'capitec',
  stepHours = 16,
): Order {
  const items: OrderItem[] = productIds.map(([pid, qty]) => {
    const p = getProduct(pid);
    if (!p) throw new Error(`Demo seed: unknown product ${pid}`);
    return { id: p.id, name: p.name, price: p.price, image: p.image, qty };
  });
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const deliveryFee = computeDeliveryFee(subtotal, courier);
  const createdAt = Date.now() - daysAgo * DAY;
  const history: StatusEntry[] = [];
  if (targetStatus === 'cancelled') {
    history.push({ status: 'order_received', at: createdAt, note: 'Order placed' });
    history.push({ status: 'cancelled', at: createdAt + 6 * HOUR, note: 'Cancelled at customer request' });
  } else {
    const flowUpTo = STATUS_FLOW.slice(0, STATUS_FLOW.indexOf(targetStatus) + 1);
    flowUpTo.forEach((status, i) => {
      history.push({
        status,
        at: createdAt + i * stepHours * HOUR,
        note: i === 0 ? 'Order placed' : undefined,
      });
    });
  }
  const order: Order = {
    id: generateOrderId(),
    userId: user.id,
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    city,
    courier,
    deliveryPoint:
      courier === 'paxi'
        ? city === 'Polokwane'
          ? 'PEP Mall of the North, Polokwane'
          : 'PEP Carlton Centre, Johannesburg'
        : city === 'Polokwane'
          ? 'PostNet Savannah Mall, Polokwane'
          : 'PostNet Sandton City, Johannesburg',
    contact: {
      name: user.name,
      email: user.email,
      phone: user.phone ?? '+27 82 000 0000',
    },
    paymentMethod,
    paymentMode,
    paymentRef: paymentMode === 'request' ? '0631917709' : undefined,
    proofOfPayment:
      paymentMode === 'send' && targetStatus !== 'order_received'
        ? 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz48L3N2Zz4='
        : undefined,
    status: targetStatus,
    statusHistory: history,
    createdAt,
    updatedAt: history[history.length - 1]?.at ?? createdAt,
  };
  if (
    targetStatus === 'delivered' &&
    businessDaysBetween(createdAt, order.updatedAt) > 6
  ) {
    order.latePromiseNote = LATE_PROMISE_NOTE;
  }
  return order;
}

/**
 * Idempotent: if no orders exist, create two demo customers and five orders
 * in varied statuses across both cities so admin/tracker pages have data.
 */
export function seedDemoData(): void {
  if (ordersCache.length > 0) return;
  const lerato = seedDemoUser('Lerato Mokoena', 'lerato@example.com', '+27 82 555 0147');
  const thandi = seedDemoUser('Thandi Ndlovu', 'thandi@example.com', '+27 73 555 0192');

  const demo: Order[] = [
    // Delivered, but slower than 6 business days → carries the late-promise note.
    demoOrder(lerato, [['bob12', 1], ['bouncy26', 1]], 'Johannesburg', 'paxi', 'delivered', 12, 'send', 'capitec', 56),
    demoOrder(thandi, [['human30', 1], ['bouncy30', 1], ['bob14', 2]], 'Polokwane', 'postnet', 'shipped', 4, 'request', 'payshap'),
    demoOrder(lerato, [['bob8', 2]], 'Johannesburg', 'paxi', 'crafting', 3, 'request', 'payshap'),
    demoOrder(thandi, [['bouncy28', 1]], 'Polokwane', 'paxi', 'payment_confirmed', 2, 'send', 'capitec'),
    demoOrder(lerato, [['human28', 1], ['bob10', 1]], 'Johannesburg', 'postnet', 'order_received', 0, 'request', 'payshap'),
  ];
  ordersCache = sortNewestFirst([...demo, ...ordersCache]);
  persistOrders();
}

// Demo seeding is DEV-only: production builds must never inject fake orders
// or demo accounts (they'd pollute real admin KPIs and be trackable by anyone).
if (import.meta.env.DEV) {
  try {
    seedDemoData();
  } catch {
    /* demo seeding is best-effort */
  }
}
