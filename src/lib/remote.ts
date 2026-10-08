/**
 * NaumiCrowns — Supabase sync layer.
 *
 * The app keeps its fast synchronous localStorage facade (src/lib/backend.ts)
 * for rendering; this module mirrors everything to Supabase when the
 * connection env vars are present:
 *
 *   VITE_SUPABASE_URL        — Project URL (Project Settings → API)
 *   VITE_SUPABASE_ANON_KEY   — anon public key (same page)
 *
 * With no env vars the app runs exactly as before (browser-local preview).
 * With env vars: accounts appear in Supabase Auth, orders land in the
 * orders table in realtime, and emails go out through the send-email
 * edge function (Brevo).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EmailKind, FeeSettings, Order, OrderStatus } from './backend';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isRemoteEnabled(): boolean {
  return !!(URL && ANON);
}

let sb: SupabaseClient | null = null;
export function getRemote(): SupabaseClient | null {
  if (!isRemoteEnabled()) return null;
  if (!sb) sb = createClient(URL!, ANON!);
  return sb;
}

/* ============================================================
   Row mapping — facade Order ↔ public.orders row
   ============================================================ */

function orderToRow(o: Order, supaUserId: string | null) {
  return {
    id: o.id,
    user_id: supaUserId,
    contact: o.contact,
    city: o.city,
    courier: o.courier,
    delivery_point: o.deliveryPoint,
    items: o.items,
    subtotal: o.subtotal,
    delivery_fee: o.deliveryFee,
    total: o.total,
    payment_mode: o.paymentMode,
    payment_method: o.paymentMethod,
    payment_ref: o.paymentRef ?? null,
    proof_of_payment: o.proofOfPayment ?? null,
    status: o.status,
    status_history: o.statusHistory,
    late_promise_note: o.latePromiseNote ?? null,
    created_at: new Date(o.createdAt).toISOString(),
    updated_at: new Date(o.updatedAt).toISOString(),
  };
}

function rowToOrder(r: Record<string, unknown>, localUserId: string): Order {
  return {
    id: r.id as string,
    userId: localUserId,
    items: (r.items as Order['items']) ?? [],
    subtotal: r.subtotal as number,
    deliveryFee: r.delivery_fee as number,
    total: r.total as number,
    city: r.city as Order['city'],
    courier: r.courier as Order['courier'],
    deliveryPoint: r.delivery_point as string,
    contact: r.contact as Order['contact'],
    paymentMethod: r.payment_method as Order['paymentMethod'],
    paymentMode: r.payment_mode as Order['paymentMode'],
    paymentRef: (r.payment_ref as string) ?? undefined,
    proofOfPayment: (r.proof_of_payment as string) ?? undefined,
    status: r.status as OrderStatus,
    statusHistory: (r.status_history as Order['statusHistory']) ?? [],
    createdAt: Date.parse(r.created_at as string),
    updatedAt: Date.parse(r.updated_at as string),
    latePromiseNote: (r.late_promise_note as string) ?? undefined,
  };
}

function orderPayload(o: Order) {
  return {
    id: o.id,
    contact: o.contact,
    city: o.city,
    courier: o.courier,
    delivery_point: o.deliveryPoint,
    items: o.items,
    subtotal: o.subtotal,
    delivery_fee: o.deliveryFee,
    total: o.total,
    payment_mode: o.paymentMode,
    payment_method: o.paymentMethod,
    payment_ref: o.paymentRef,
    status: o.status,
    late_promise_note: o.latePromiseNote,
  };
}

/* ============================================================
   Auth mirroring — facade accounts get real Supabase Auth users
   (the handle_new_user trigger creates their profiles row, so
   customers appear in the Supabase dashboard).
   ============================================================ */

export async function remoteSignUp(
  name: string,
  email: string,
  password: string,
  phone?: string,
): Promise<void> {
  const c = getRemote();
  if (!c) return;
  const res = await c.auth.signUp({
    email,
    password,
    options: { data: { name, phone: phone ?? '' } },
  });
  // Already registered remotely (e.g. account predates the wiring)? Then just sign in.
  if (res.error && /already/i.test(res.error.message)) {
    await c.auth.signInWithPassword({ email, password });
  }
}

export async function remoteSignIn(email: string, password: string): Promise<void> {
  const c = getRemote();
  if (!c) return;
  const res = await c.auth.signInWithPassword({ email, password });
  // Exists locally but never mirrored (account created before wiring)? Create it.
  if (res.error && /invalid/i.test(res.error.message)) {
    await c.auth.signUp({ email, password });
  }
}

export async function remoteSignOut(): Promise<void> {
  const c = getRemote();
  if (!c) return;
  await c.auth.signOut();
}

/** Current Supabase session user id (needed for RLS on order writes). */
export async function remoteUserId(): Promise<string | null> {
  const c = getRemote();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session?.user.id ?? null;
}

/* ============================================================
   Data sync
   ============================================================ */

export async function pushOrder(o: Order): Promise<void> {
  const c = getRemote();
  if (!c) return;
  try {
    const uid = await remoteUserId();
    await c.from('orders').upsert(orderToRow(o, uid), { onConflict: 'id' });
  } catch (e) {
    console.warn('[remote] pushOrder failed', e);
  }
}

export async function pushSettings(s: FeeSettings): Promise<void> {
  const c = getRemote();
  if (!c) return;
  try {
    await c.from('fee_settings').update({ paxi_fee: s.paxiFee, postnet_fee: s.postnetFee }).eq('id', true);
  } catch (e) {
    console.warn('[remote] pushSettings failed', e);
  }
}

export async function fetchSettings(): Promise<FeeSettings | null> {
  const c = getRemote();
  if (!c) return null;
  const { data } = await c.from('fee_settings').select('*').eq('id', true).maybeSingle();
  return data ? { paxiFee: data.paxi_fee, postnetFee: data.postnet_fee } : null;
}

/* ============================================================
   Emails — the send-email edge function templates, authorises,
   writes the outbox audit row, and sends via Brevo.
   ============================================================ */

export async function pushOrderEmail(kind: EmailKind, o: Order, note?: string): Promise<void> {
  const c = getRemote();
  if (!c) return;
  try {
    await c.functions.invoke('send-email', {
      body: { kind, order: orderPayload(o), note, origin: window.location.origin },
    });
  } catch (e) {
    console.warn('[remote] pushOrderEmail failed', e);
  }
}

export async function pushWeeklyReportEmail(report: unknown): Promise<void> {
  const c = getRemote();
  if (!c) return;
  try {
    await c.functions.invoke('send-email', {
      body: { kind: 'weekly_report', report, origin: window.location.origin },
    });
  } catch (e) {
    console.warn('[remote] pushWeeklyReportEmail failed', e);
  }
}

/* ============================================================
   Hydration + realtime — Supabase is the cross-device source.
   The backend hands us callbacks at init; we feed rows in.
   ============================================================ */

export interface RemoteHooks {
  /** Replace/merge orders from the cloud into the local cache. */
  onRemoteOrders: (orders: Order[], uuidEmailMap: Map<string, string>) => void;
  /** A Supabase session exists on load — hand the profile to the facade. */
  onRemoteProfile: (p: { id: string; name: string; email: string; phone?: string; isAdmin: boolean }) => void;
}

export async function initRemote(hooks: RemoteHooks): Promise<void> {
  const c = getRemote();
  if (!c) return;

  // 1. Existing session → hand the profile to the facade for sign-in persistence.
  const { data: sessionData } = await c.auth.getSession();
  const uid = sessionData.session?.user.id;
  if (uid) {
    const { data: profile } = await c.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (profile) {
      hooks.onRemoteProfile({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone ?? undefined,
        isAdmin: !!profile.is_admin,
      });
    }
  }

  // 2. Hydrate orders (RLS scopes: own orders, or all for admins).
  const uuidEmailMap = new Map<string, string>();
  try {
    const { data: profiles } = await c.from('profiles').select('id, email');
    profiles?.forEach((p: { id: string; email: string }) => uuidEmailMap.set(p.id, p.email));
  } catch { /* customers can only read their own profile — fine */ }

  const { data: rows } = await c.from('orders').select('*').order('created_at', { ascending: false });
  if (rows) {
    hooks.onRemoteOrders(
      rows.map((r: Record<string, unknown>) =>
        rowToOrder(r, uuidEmailMap.get(r.user_id as string) ?? ((r.user_id as string) || 'guest')),
      ),
      uuidEmailMap,
    );
  }

  // 3. Realtime — admin dashboard and trackers update live.
  c.channel('orders-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      const row = (payload.new ?? payload.old) as Record<string, unknown> | undefined;
      if (!row?.id) return;
      hooks.onRemoteOrders(
        [rowToOrder(row, uuidEmailMap.get(row.user_id as string) ?? ((row.user_id as string) || 'guest'))],
        uuidEmailMap,
      );
    })
    .subscribe();
}
