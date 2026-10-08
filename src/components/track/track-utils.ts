/**
 * Shared helpers for the Track + ThankYou pages.
 * Pure date/format/URL math only — all order data still flows through
 * `@/lib/backend` (no invented backend functions).
 */
import type { Order, OrderStatus } from '@/lib/backend';
import { COURIERS } from '@/lib/catalog';
import { SITE } from '@/lib/site';
import type { OrderStatus as ChipStatus } from '@/components/StatusChip';

/** Map a backend order status onto the shared StatusChip ids. */
export function chipStatus(s: OrderStatus): ChipStatus {
  return s === 'order_received' ? 'received' : s;
}

/** Normalize a typed order number to the canonical `NC-XXXXXX` form. */
export function normalizeOrderId(raw: string): string {
  const clean = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) return '';
  return clean.startsWith('NC-') ? clean : `NC-${clean.replace(/^NC/, '')}`;
}

/** Loose phone comparison — last 9 digits (handles +27 / 0 prefixes). */
export function phoneMatches(a: string, b: string): boolean {
  const da = a.replace(/\D/g, '');
  const db = b.replace(/\D/g, '');
  if (!da || !db) return false;
  return da.slice(-9) === db.slice(-9);
}

/** Guest lookup gate: order must match the email or phone used at checkout. */
export function contactMatchesOrder(order: Order, contactRaw: string): boolean {
  const contact = contactRaw.trim();
  if (!contact) return false;
  if (contact.includes('@')) {
    return order.contact.email.toLowerCase() === contact.toLowerCase();
  }
  return phoneMatches(order.contact.phone, contact);
}

/* ---------- business-day math (mirrors backend.ts rules) ---------- */

export function addBusinessDays(from: number, days: number): number {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.getTime();
}

/** Business working days (Mon–Fri) elapsed between two timestamps. */
export function businessDaysElapsed(from: number, to: number): number {
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

/**
 * Estimated delivery window: processing (1–2 working days) plus courier
 * transit (Paxi 2–4 / PostNet 1–3 working days), counted from order date.
 */
export function estimateRange(order: Order): { from: number; to: number } {
  const [cMin, cMax] = order.courier === 'paxi' ? [2, 4] : [1, 3];
  return {
    from: addBusinessDays(order.createdAt, 1 + cMin),
    to: addBusinessDays(order.createdAt, 2 + cMax),
  };
}

export function formatDay(ts: number): string {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    day: 'numeric',
    month: 'short',
  }).format(new Date(ts));
}

/** Display tracking reference derived from the order id (PX- / PN-). */
export function trackingRef(order: Order): string {
  return `${order.courier === 'paxi' ? 'PX' : 'PN'}-${order.id.replace(/^NC-/, '')}`;
}

/** WhatsApp deep link with a prefilled order message. */
export function whatsappOrderLink(orderId: string): string {
  const msg = `Hi NaumiCrowns, my order is ${orderId} — I have a question.`;
  return `${SITE.whatsapp}?text=${encodeURIComponent(msg)}`;
}

/** Courier display name shortcut. */
export function courierName(order: Order): string {
  return COURIERS[order.courier].name;
}

/** Short courier label used in timeline helper lines. */
export function courierShort(order: Order): string {
  return order.courier === 'paxi' ? 'Paxi' : 'PostNet';
}

/**
 * Clipboard copy with a non-secure-context fallback.
 * Returns true on success so callers can toast.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
