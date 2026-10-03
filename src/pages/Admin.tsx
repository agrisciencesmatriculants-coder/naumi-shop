import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import {
  ADMIN_EMAILS,
  GEORGE_EMAIL,
  STATUS_LABELS,
  STATUS_STEPS,
  getSettings,
  listOutbox,
  nextStatus,
  setSettings,
  subscribeOutbox,
  subscribeSettings,
  confirmPayment,
  updateOrderStatus,
  useCurrentUser,
  useOrders,
} from '@/lib/backend';
import type { EmailMessage, Order, OrderStatus } from '@/lib/backend';
import { COURIERS, FREE_DELIVERY_THRESHOLD, PRODUCTS, formatPrice } from '@/lib/catalog';
import {
  MANAGERS,
  getSecurityScanLog,
  getThread,
  isReportWindow,
} from '@/lib/office';
import Icon from '@/components/Icon';
import ProductImage from '@/components/ProductImage';
import StatusChip from '@/components/StatusChip';
import OrderSheet, { chipStatus } from '@/components/admin/OrderSheet';
import {
  AdminGate,
  AdminHeader,
  AdminTabBar,
  CountUp,
  StaffAvatar,
  timeAgo,
  useNow,
} from '@/components/admin/chrome';
import type { AdminTab } from '@/components/admin/chrome';
import { cn } from '@/lib/utils';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

type OrderFilter = 'all' | OrderStatus;

const ORDER_FILTERS: { id: OrderFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...STATUS_STEPS.map((s) => ({ id: s.id as OrderFilter, label: s.label })),
  { id: 'cancelled', label: 'Cancelled' },
];

const KIND_LABEL: Record<EmailMessage['kind'], string> = {
  order_confirmation: 'Order',
  payment: 'Payment',
  weekly_report: 'Report',
  status_update: 'Status',
};

/** Orders created on the same SAST calendar day as now. */
function isTodaySast(ts: number): boolean {
  const a = new Date(ts + 2 * HOUR_MS);
  const b = new Date(Date.now() + 2 * HOUR_MS);
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export default function Admin() {
  const user = useCurrentUser();
  return <AdminGate user={user}>{(admin) => <AdminView user={admin} />}</AdminGate>;
}

function AdminView({ user }: { user: NonNullable<ReturnType<typeof useCurrentUser>> }) {
  const orders = useOrders();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const reduced = useReducedMotion();
  useNow(30_000); // keep age timers fresh

  const tabParam = params.get('tab');
  const tab: AdminTab =
    tabParam === 'orders' || tabParam === 'payments' || tabParam === 'stock'
      ? tabParam
      : 'dashboard';
  const setTab = (t: AdminTab) =>
    setParams(t === 'dashboard' ? {} : { tab: t }, { replace: true });

  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Live settings + outbox
  const [settings, setLocalSettings] = useState(getSettings);
  const [outbox, setOutbox] = useState(listOutbox);
  useEffect(() => subscribeSettings(() => setLocalSettings(getSettings())), []);
  useEffect(() => subscribeOutbox(() => setOutbox(listOutbox())), []);

  const scans = getSecurityScanLog();
  const blockedScans = scans.filter((s) => s.severity === 'blocked').length;
  const isGeorge = user.email.trim().toLowerCase() === GEORGE_EMAIL;
  const reportLive = isReportWindow();

  /* ---------- KPIs ---------- */
  const ordersToday = useMemo(() => orders.filter((o) => isTodaySast(o.createdAt)), [orders]);
  const weekOrders = useMemo(
    () => orders.filter((o) => Date.now() - o.createdAt < 7 * DAY_MS && o.status !== 'cancelled'),
    [orders],
  );
  const revenueWeek = weekOrders.reduce((n, o) => n + o.total, 0);
  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === 'order_received'),
    [orders],
  );
  const pendingValue = pendingOrders.reduce((n, o) => n + o.total, 0);
  const activeChats = useMemo(
    () => MANAGERS.filter((m) => getThread(m.id).length > 0).length,
    // recompute whenever orders change is fine — threads live in localStorage
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders],
  );

  // 7-day revenue sparkline points (oldest → today).
  const spark = useMemo(() => {
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDaySast(Date.now() - i * DAY_MS);
      const total = weekOrders
        .filter((o) => o.createdAt >= dayStart && o.createdAt < dayStart + DAY_MS)
        .reduce((n, o) => n + o.total, 0);
      days.push(total);
    }
    return days;
  }, [weekOrders]);

  const filteredOrders = useMemo(
    () => (orderFilter === 'all' ? orders : orders.filter((o) => o.status === orderFilter)),
    [orders, orderFilter],
  );
  const selectedOrder = selectedId ? (orders.find((o) => o.id === selectedId) ?? null) : null;

  const alertCount = pendingOrders.length + blockedScans;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="pb-[96px]"
    >
      <AdminHeader
        user={user}
        title="The Crown Office"
        subtitle="George & Naumi · Co-owners"
        alertCount={alertCount}
        onBell={() => setTab('payments')}
      />

      {/* ================= DASHBOARD ================= */}
      {tab === 'dashboard' && (
        <div className="space-y-5 px-4 py-5">
          {/* KPI row (admin.md §2) */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              index={0}
              icon="receipt_long"
              tint="text-berry"
              bg="bg-berry/10"
              label="Orders Today"
            >
              <CountUp value={ordersToday.length} className="font-display text-2xl font-bold text-berry" />
            </KpiCard>
            <KpiCard
              index={1}
              icon="payments"
              tint="text-[#8a6d00]"
              bg="bg-gold-soft/70"
              label="Revenue This Week"
            >
              <CountUp
                value={revenueWeek}
                format={(n) => formatPrice(n)}
                className="font-display text-[1.15rem] font-bold leading-tight text-berry"
              />
              <Sparkline data={spark} reduced={!!reduced} />
            </KpiCard>
            <KpiCard
              index={2}
              icon="hourglass_top"
              tint="text-rose-deep"
              bg="bg-rose-deep/10"
              label="Pending Payments"
              pulse={pendingOrders.length > 0}
            >
              <CountUp value={pendingOrders.length} className="font-display text-2xl font-bold text-rose-deep" />
              <span className="block text-[0.62rem] font-medium text-rose-deep">
                {formatPrice(pendingValue)} waiting
              </span>
            </KpiCard>
            <KpiCard
              index={3}
              icon="chat_bubble"
              tint="text-success"
              bg="bg-success/10"
              label="Active Chats"
            >
              <CountUp value={activeChats} className="font-display text-2xl font-bold text-success" />
              <span className="block text-[0.62rem] font-medium text-rose-deep">office threads</span>
            </KpiCard>
          </div>

          {/* Security card (admin.md §6) */}
          <motion.section
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="rounded-[20px] border border-gold/50 p-4 text-white"
            style={{ background: 'linear-gradient(135deg, #17120E, #3B332B)' }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 text-gold">
                  <Icon name="security" size={1.1} />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold">Agent Shield — Security</h3>
                  <p className="text-[0.65rem] uppercase tracking-[1.5px] text-gold/90">
                    Chief Security Officer · Mon · Wed · Fri · Sat
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.62rem] font-semibold text-rose-petal">
                Last sweep {timeAgo(Math.max(...scans.map((s) => s.at)))}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/8 px-2 py-2.5">
                <CountUp value={blockedScans} className="font-display text-xl font-bold text-gold" />
                <span className="block text-[0.58rem] uppercase tracking-[1px] text-rose-petal/80">
                  Blocked
                </span>
              </div>
              <div className="rounded-xl bg-white/8 px-2 py-2.5">
                <CountUp
                  value={scans.filter((s) => s.severity === 'warning').length}
                  className="font-display text-xl font-bold text-rose-petal"
                />
                <span className="block text-[0.58rem] uppercase tracking-[1px] text-rose-petal/80">
                  Rate limits
                </span>
              </div>
              <div className="rounded-xl bg-white/8 px-2 py-2.5">
                <CountUp value={scans.length} className="font-display text-xl font-bold text-white" />
                <span className="block text-[0.58rem] uppercase tracking-[1px] text-rose-petal/80">
                  Events today
                </span>
              </div>
            </div>

            {isGeorge ? (
              <>
                <ul className="mb-3 space-y-1.5">
                  {scans.slice(0, 4).map((s) => (
                    <li key={s.id} className="flex items-start gap-2 text-[0.7rem] text-white/85">
                      <Icon
                        name={
                          s.severity === 'blocked'
                            ? 'block'
                            : s.severity === 'warning'
                              ? 'warning'
                              : 'check_circle'
                        }
                        size={0.85}
                        className={cn(
                          'mt-0.5 shrink-0',
                          s.severity === 'blocked'
                            ? 'text-gold'
                            : s.severity === 'warning'
                              ? 'text-rose-petal'
                              : 'text-success',
                        )}
                      />
                      <span>
                        <span className="font-semibold">{s.event}.</span>{' '}
                        <span className="text-white/60">{s.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate('/admin/office?chat=mgr_shield')}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gold py-2.5 text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-plum transition-transform hover:-translate-y-0.5"
                >
                  <Icon name="shield" size={0.95} /> Chat with Agent Shield
                </button>
              </>
            ) : (
              <p className="rounded-xl border border-gold/30 bg-white/5 px-3 py-2.5 text-[0.7rem] text-rose-petal/90">
                <Icon name="lock" size={0.8} className="mr-1 align-[-2px] text-gold" />
                Summary only — Agent Shield reports detail and 1:1 chats to George directly.
              </p>
            )}
          </motion.section>

          {/* Office entry card (admin.md §7) */}
          <motion.section
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
              'rounded-[24px] p-5 text-white shadow-float',
              reportLive ? 'ring-2 ring-gold' : '',
            )}
            style={{ background: 'linear-gradient(135deg, #211B16, #151110)' }}
          >
            <div className="mb-3 flex -space-x-3">
              {MANAGERS.map((m, i) => (
                <motion.span
                  key={m.id}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.06 * i, type: 'spring', stiffness: 300, damping: 22 }}
                >
                  <StaffAvatar staff={m} size={40} ring="#FBF8F1" />
                </motion.span>
              ))}
            </div>
            <h3 className="font-display text-lg font-bold">The Office — your 30-robot team</h3>
            <p className="mt-1 text-[0.75rem] text-white/80">
              6 managers on duty 06:00–18:00 · 2 stylists on shift · Saturday reports 17:00–21:00
            </p>
            {reportLive && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[1px] text-plum">
                <span className="h-1.5 w-1.5 rounded-full bg-plum" style={{ animation: 'ncPulse 1.5s infinite' }} />
                Weekly report is LIVE — managers are presenting now
              </p>
            )}
            <button
              type="button"
              onClick={() => navigate('/admin/office')}
              className="mt-3 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-berry transition-transform hover:-translate-y-0.5"
            >
              Enter the Office <Icon name="arrow_forward" size={0.95} />
            </button>
          </motion.section>

          {/* Email outbox viewer */}
          <section className="rounded-[20px] border border-blush bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-charcoal">
                <Icon name="outbox" size={1.05} className="text-berry" /> Email Outbox
              </h3>
              <span className="rounded-full bg-blush px-2.5 py-0.5 text-[0.62rem] font-bold text-berry">
                {outbox.length} sent
              </span>
            </div>
            {outbox.length === 0 ? (
              <p className="text-[0.78rem] text-rose-deep">
                No emails yet — order confirmations, status updates and Saturday reports appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {outbox.slice(0, 8).map((m) => (
                  <OutboxRow key={m.id} msg={m} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ================= ORDERS ================= */}
      {tab === 'orders' && (
        <div className="px-4 py-5">
          {/* Filter pills (port of home cat-bar) */}
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {ORDER_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setOrderFilter(f.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[1px] transition-colors',
                  orderFilter === f.id
                    ? 'border-berry bg-berry text-white shadow-[0_4px_15px_rgba(33,27,22,0.35)]'
                    : 'border-rose-petal/60 bg-white text-rose-deep hover:border-berry hover:text-berry',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full text-white"
                style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
              >
                <Icon name="receipt_long" size={1.5} />
              </span>
              <p className="font-display text-lg italic text-berry">No orders in this stage</p>
              <p className="max-w-[260px] text-[0.78rem] text-rose-deep">
                New orders land in “Order Received” and move along as you advance them.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredOrders.map((order, i) => (
                <motion.li
                  key={order.id}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.06, 0.5), duration: 0.35, ease: 'easeOut' }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(order.id)}
                    className="w-full rounded-2xl border border-blush bg-white p-4 text-left shadow-soft transition-transform hover:-translate-y-0.5"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-display text-[1.05rem] font-bold text-berry">
                          {order.id}
                        </span>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-charcoal">
                          <span className="font-semibold">{order.contact.name}</span>
                          <CityChip city={order.city} />
                        </p>
                      </div>
                      <StatusChip status={chipStatus(order.status)} />
                    </div>
                    <p className="mb-2 truncate text-[0.75rem] text-rose-deep">
                      {order.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
                    </p>
                    <div className="flex items-center justify-between text-[0.72rem]">
                      <span className="flex items-center gap-1 text-rose-deep">
                        <Icon name="local_shipping" size={0.85} />
                        {COURIERS[order.courier].name}
                        <span className="text-rose-petal">·</span>
                        {timeAgo(order.createdAt)}
                      </span>
                      <span className="font-display text-sm font-bold text-berry">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                    {nextStatus(order.status) && (
                      <p className="mt-2 flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[1px] text-berry/80">
                        <Icon name="arrow_forward" size={0.75} />
                        Next: {STATUS_LABELS[nextStatus(order.status)!]}
                      </p>
                    )}
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ================= PAYMENTS ================= */}
      {tab === 'payments' && (
        <PaymentsTab orders={orders} onOpen={setSelectedId} reduced={!!reduced} showToast={showToast} />
      )}

      {/* ================= STOCK ================= */}
      {tab === 'stock' && (
        <StockTab settings={settings} reduced={!!reduced} showToast={showToast} />
      )}

      <AdminTabBar
        active={tab}
        badges={{ orders: ordersToday.length, payments: pendingOrders.length }}
      />

      <OrderSheet order={selectedOrder} onClose={() => setSelectedId(null)} />
    </motion.div>
  );
}

/* ============================================================
   Dashboard bits
   ============================================================ */

function KpiCard({
  index,
  icon,
  tint,
  bg,
  label,
  pulse,
  children,
}: {
  index: number;
  icon: string;
  tint: string;
  bg: string;
  label: string;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'rounded-2xl border border-blush bg-white p-3.5 shadow-soft',
        pulse && 'ring-1 ring-gold/60',
      )}
      style={pulse ? { animation: 'ncPulse 2s infinite' } : undefined}
    >
      <span className={cn('mb-2 flex h-8 w-8 items-center justify-center rounded-full', bg, tint)}>
        <Icon name={icon} size={1} />
      </span>
      {children}
      <span className="mt-0.5 block text-[0.62rem] font-semibold uppercase tracking-[1px] text-rose-deep">
        {label}
      </span>
    </motion.div>
  );
}

/** 7-day revenue sparkline: berry gradient stroke, gold dot on today. */
function Sparkline({ data, reduced }: { data: number[]; reduced: boolean }) {
  const W = 120;
  const H = 28;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (W - 8) + 4;
    const y = H - 4 - (v / max) * (H - 8);
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 h-7 w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ncSpark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E3D5BC" />
          <stop offset="100%" stopColor="#211B16" />
        </linearGradient>
      </defs>
      <motion.path
        d={path}
        fill="none"
        stroke="url(#ncSpark)"
        strokeWidth={2.5}
        strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <circle cx={last[0]} cy={last[1]} r={3} fill="#D4AF37" />
    </svg>
  );
}

function CityChip({ city }: { city: Order['city'] }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.5px]',
        city === 'Polokwane' ? 'bg-rose-mid/15 text-rose-mid' : 'bg-rose-deep/15 text-rose-deep',
      )}
    >
      {city}
    </span>
  );
}

function OutboxRow({ msg }: { msg: EmailMessage }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-blush bg-porcelain">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[0.56rem] font-bold uppercase tracking-[0.5px]',
            msg.kind === 'weekly_report'
              ? 'bg-gold-soft text-[#8a6d00]'
              : msg.kind === 'payment'
                ? 'bg-success/10 text-success'
                : msg.kind === 'status_update'
                  ? 'bg-berry/10 text-berry'
                  : 'bg-rose-mid/15 text-rose-mid',
          )}
        >
          {KIND_LABEL[msg.kind]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.74rem] font-semibold text-charcoal">
            {msg.subject}
          </span>
          <span className="block truncate text-[0.65rem] text-rose-deep">
            to {msg.to} · {timeAgo(msg.at)}
          </span>
        </span>
        <Icon
          name={open ? 'expand_less' : 'expand_more'}
          size={1}
          className="shrink-0 text-rose-petal"
        />
      </button>
      {open && (
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap border-t border-blush px-3 py-2.5 font-sans text-[0.7rem] leading-relaxed text-charcoal/80">
          {msg.body}
        </pre>
      )}
    </li>
  );
}

/** Midnight SAST (as epoch ms) of the day containing `ts`. */
function startOfDaySast(ts: number): number {
  const d = new Date(ts + 2 * HOUR_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 2 * HOUR_MS;
}

/* ============================================================
   Payments tab (admin.md §4)
   ============================================================ */

const REJECT_REASONS = ['No payment received', 'Proof unclear', 'Duplicate order'];

function PaymentsTab({
  orders,
  onOpen,
  reduced,
  showToast,
}: {
  orders: Order[];
  onOpen: (id: string) => void;
  reduced: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const queue = orders.filter((o) => o.status === 'order_received');
  const requestSent = queue.filter((o) => o.paymentMode === 'request');

  const weekCollected = orders
    .filter((o) => o.status !== 'order_received' && o.status !== 'cancelled' && Date.now() - o.createdAt < 7 * DAY_MS)
    .reduce((n, o) => n + o.total, 0);
  const weekPending = queue
    .filter((o) => Date.now() - o.createdAt < 7 * DAY_MS)
    .reduce((n, o) => n + o.total, 0);
  const splitTotal = weekCollected + weekPending;

  const reject = (order: Order, reason: string) => {
    updateOrderStatus(order.id, 'cancelled', `Payment rejected: ${reason}`);
    showToast(`${order.id} payment rejected — order cancelled`, 'info');
    setRejectingId(null);
  };

  return (
    <div className="space-y-5 px-4 py-5">
      {/* Weekly totals strip */}
      <section className="rounded-[20px] border border-blush bg-white p-4 shadow-soft">
        <h3 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-charcoal">
          <Icon name="monitoring" size={1.05} className="text-berry" /> This Week
        </h3>
        <p className="mb-3 text-[0.72rem] text-rose-deep">Collected vs still pending</p>
        <div className="flex h-3.5 overflow-hidden rounded-full bg-blush">
          <motion.div
            className="h-full bg-gradient-to-r from-gold-soft to-gold"
            initial={{ width: 0 }}
            animate={{ width: splitTotal ? `${(weekCollected / splitTotal) * 100}%` : '0%' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.div
            className="h-full bg-gradient-to-r from-berry to-berry-deep"
            initial={{ width: 0 }}
            animate={{ width: splitTotal ? `${(weekPending / splitTotal) * 100}%` : '0%' }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[0.72rem] font-semibold">
          <span className="text-[#8a6d00]">Collected {formatPrice(weekCollected)}</span>
          <span className="text-berry">Pending {formatPrice(weekPending)}</span>
        </div>
      </section>

      {/* Queue */}
      <section>
        <h3 className="mb-2.5 flex items-center gap-2 font-display text-base font-bold text-charcoal">
          <Icon name="hourglass_top" size={1.05} className="text-rose-deep" />
          Awaiting Confirmation
          {queue.length > 0 && (
            <span className="rounded-full bg-berry px-2 py-0.5 text-[0.6rem] font-bold text-white">
              {queue.length}
            </span>
          )}
        </h3>
        {queue.length === 0 ? (
          <p className="rounded-2xl border border-blush bg-white p-4 text-[0.78rem] text-rose-deep shadow-soft">
            Nothing waiting — every order’s payment is confirmed. Well run.
          </p>
        ) : (
          <ul className="space-y-3">
            {queue.map((order, i) => {
              const ageMs = Date.now() - order.createdAt;
              const ageTone =
                ageMs > 24 * HOUR_MS ? 'text-berry-deep' : ageMs > 2 * HOUR_MS ? 'text-[#8a6d00]' : 'text-rose-deep';
              return (
                <motion.li
                  key={order.id}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35, ease: 'easeOut' }}
                  className="rounded-2xl border border-blush bg-white p-4 shadow-soft"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpen(order.id)}
                        className="font-display text-[1.05rem] font-bold text-berry underline-offset-2 hover:underline"
                      >
                        {order.id}
                      </button>
                      <p className="text-[0.72rem] text-charcoal">
                        {order.contact.name} · {order.paymentMethod === 'payshap' ? 'PayShap' : 'Capitec'} ·{' '}
                        {order.paymentMode === 'request' ? 'we requested' : 'customer sends'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-display text-lg font-bold text-berry">
                        {formatPrice(order.total)}
                      </span>
                      <p className={cn('flex items-center justify-end gap-1 text-[0.65rem] font-semibold', ageTone)}>
                        <Icon name="schedule" size={0.75} />
                        {timeAgo(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  {order.proofOfPayment && (
                    <button
                      type="button"
                      onClick={() => onOpen(order.id)}
                      className="mb-2.5 flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-[0.7rem] font-semibold text-success"
                    >
                      <Icon name="receipt" size={0.9} /> Proof uploaded — tap to review
                    </button>
                  )}

                  {rejectingId === order.id ? (
                    <div className="rounded-xl border border-plum/25 bg-porcelain p-3">
                      <p className="mb-2 text-[0.72rem] font-semibold text-plum">
                        Reject why? (the order is cancelled and the customer emailed)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {REJECT_REASONS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => reject(order, r)}
                            className="rounded-full border border-plum/40 px-3 py-1.5 text-[0.65rem] font-semibold text-plum transition-colors hover:bg-plum hover:text-white"
                          >
                            {r}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setRejectingId(null)}
                          className="rounded-full px-3 py-1.5 text-[0.65rem] font-semibold text-rose-deep"
                        >
                          Never mind
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <ConfirmButton orderId={order.id} showToast={showToast} />
                      <button
                        type="button"
                        onClick={() => setRejectingId(order.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-plum/60 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[1px] text-plum transition-colors hover:bg-plum hover:text-white"
                      >
                        <Icon name="block" size={0.85} /> Reject
                      </button>
                    </div>
                  )}
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Request-sent list */}
      <section>
        <h3 className="mb-2.5 flex items-center gap-2 font-display text-base font-bold text-charcoal">
          <Icon name="send_to_mobile" size={1.05} className="text-berry" /> Requests Sent
        </h3>
        {requestSent.length === 0 ? (
          <p className="rounded-2xl border border-blush bg-white p-4 text-[0.78rem] text-rose-deep shadow-soft">
            No open PayShap/Capitec requests right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {requestSent.map((order) => (
              <li
                key={order.id}
                className="flex items-center gap-3 rounded-2xl border border-blush bg-white p-3 shadow-soft"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush text-berry">
                  <Icon name="send_to_mobile" size={1} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.78rem] font-semibold text-charcoal">
                    {order.id} · {formatPrice(order.total)}
                  </p>
                  <p className="truncate text-[0.68rem] text-rose-deep">
                    Requested from {order.paymentRef ?? 'customer'} · {timeAgo(order.createdAt)}
                  </p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-gold-soft/70 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.5px] text-[#8a6d00]">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" style={{ animation: 'ncPulse 2s infinite' }} />
                  Pending
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Confirm payment — flashes success green, engine advances the order + emails the customer. */
function ConfirmButton({
  orderId,
  showToast,
}: {
  orderId: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [done, setDone] = useState(false);
  return (
    <motion.button
      type="button"
      animate={done ? { scale: [1, 1.06, 1] } : undefined}
      onClick={() => {
        confirmPayment(orderId);
        setDone(true);
        showToast(`${orderId} → Payment Confirmed`);
      }}
      className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-full bg-success py-2.5 text-[0.68rem] font-semibold uppercase tracking-[1px] text-white shadow-[0_6px_18px_rgba(45,134,89,0.35)] transition-transform hover:-translate-y-0.5"
    >
      <Icon name={done ? 'check_circle' : 'check'} size={0.85} />
      {done ? 'Confirmed' : 'Confirm'}
    </motion.button>
  );
}

/* ============================================================
   Stock tab (admin.md §5)
   ============================================================ */

function StockTab({
  settings,
  reduced,
  showToast,
}: {
  settings: { paxiFee: number; postnetFee: number };
  reduced: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [paxi, setPaxi] = useState(String(settings.paxiFee));
  const [postnet, setPostnet] = useState(String(settings.postnetFee));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPaxi(String(settings.paxiFee));
    setPostnet(String(settings.postnetFee));
  }, [settings.paxiFee, settings.postnetFee]);

  const save = () => {
    const p = Number.parseInt(paxi, 10);
    const q = Number.parseInt(postnet, 10);
    if (Number.isNaN(p) || Number.isNaN(q) || p < 0 || q < 0) {
      showToast('Fees must be whole rand amounts of 0 or more', 'error');
      return;
    }
    setSettings({ paxiFee: p, postnetFee: q });
    showToast('Settings saved');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5 px-4 py-5">
      {/* Catalog rows */}
      <section>
        <h3 className="mb-2.5 flex items-center gap-2 font-display text-base font-bold text-charcoal">
          <Icon name="inventory_2" size={1.05} className="text-berry" /> The 9 Crown Lines
        </h3>
        <ul className="space-y-2">
          {PRODUCTS.map((p, i) => (
            <motion.li
              key={p.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3, ease: 'easeOut' }}
              className="flex items-center gap-3 rounded-2xl border border-blush bg-white p-3 shadow-soft"
            >
              <ProductImage
                src={p.image}
                alt={p.name}
                width={96}
                height={96}
                className="h-12 w-12 rounded-xl border border-blush object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.82rem] font-semibold text-charcoal">{p.name}</p>
                <p className="flex items-center gap-1.5 text-[0.65rem] text-rose-deep">
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-bold uppercase tracking-[0.5px] text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> In stock
                  </span>
                  <span>crafted on demand</span>
                </p>
              </div>
              {p.badge && (
                <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-[0.56rem] font-bold uppercase tracking-[0.5px] text-[#8a6d00]">
                  {p.badge}
                </span>
              )}
              <span className="shrink-0 font-display text-sm font-bold text-berry">
                {formatPrice(p.price)}
              </span>
            </motion.li>
          ))}
        </ul>
        <p className="mt-2 text-[0.68rem] italic text-rose-deep">
          Prices and badges are locked in the master catalog — every crown is handcrafted to order,
          so the floor never oversells.
        </p>
      </section>

      {/* Fee settings */}
      <section className="rounded-[20px] border border-blush bg-white p-4 shadow-soft">
        <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-charcoal">
          <Icon name="tune" size={1.05} className="text-berry" /> Delivery Settings
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <FeeInput
            label={`Paxi fee · ${COURIERS.paxi.eta}`}
            value={paxi}
            onChange={setPaxi}
          />
          <FeeInput
            label={`PostNet fee · ${COURIERS.postnet.eta}`}
            value={postnet}
            onChange={setPostnet}
          />
        </div>
        <div className="mt-3 space-y-1.5 rounded-xl bg-porcelain p-3 text-[0.72rem] text-rose-deep">
          <p className="flex items-center gap-1.5">
            <Icon name="local_shipping" size={0.85} className="text-gold" />
            Free delivery over {formatPrice(FREE_DELIVERY_THRESHOLD)} — applied automatically.
          </p>
          <p className="flex items-center gap-1.5">
            <Icon name="content_cut" size={0.85} className="text-gold" />
            Processing: 1–2 days before dispatch · no weekend shipments.
          </p>
          <p className="flex items-center gap-1.5">
            <Icon name="mail" size={0.85} className="text-gold" />
            Order alerts go to {ADMIN_EMAILS.join(' and ')}.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-berry to-berry-deep py-3 text-[0.75rem] font-semibold uppercase tracking-[1.5px] text-white shadow-[0_8px_25px_rgba(33,27,22,0.35)] transition-transform hover:-translate-y-0.5"
        >
          <Icon name={saved ? 'check_circle' : 'save'} size={1} className={saved ? 'text-gold-soft' : ''} />
          {saved ? 'Saved' : 'Save Settings'}
        </button>
      </section>
    </div>
  );
}

function FeeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.62rem] font-semibold uppercase tracking-[1px] text-rose-deep">
        {label}
      </span>
      <span className="flex items-center rounded-xl border border-rose-petal/60 bg-white transition-colors focus-within:border-berry focus-within:ring-2 focus-within:ring-berry/25">
        <span className="pl-3 font-display text-sm font-bold text-berry">R</span>
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-2 py-2.5 text-sm font-semibold text-charcoal outline-none"
        />
      </span>
    </label>
  );
}
