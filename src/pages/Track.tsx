import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  STATUS_LABELS,
  formatDateTime,
  getOrder,
  isAdminEmail,
  listOrders,
  useCurrentUser,
  useOrders,
} from '@/lib/backend';
import type { Order } from '@/lib/backend';
import { formatPrice } from '@/lib/catalog';
import { useApp } from '@/store/AppContext';
import Icon from '@/components/Icon';
import StatusChip from '@/components/StatusChip';
import OrderSummaryCard from '@/components/track/OrderSummaryCard';
import JourneyTimeline from '@/components/track/JourneyTimeline';
import LatePromiseMeter from '@/components/track/LatePromiseMeter';
import CourierCard from '@/components/track/CourierCard';
import ConciergeCard from '@/components/track/ConciergeCard';
import {
  chipStatus,
  contactMatchesOrder,
  normalizeOrderId,
  whatsappOrderLink,
} from '@/components/track/track-utils';

/* ============================================================
   Lookup hero (/track, no order selected) — tracker.md §1
   ============================================================ */

function TrackLookup() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const user = useCurrentUser();
  const orders = useOrders();
  const reduced = useReducedMotion();

  const [orderNumber, setOrderNumber] = useState('');
  const [contact, setContact] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const myOrders = useMemo(
    () => (user ? orders.filter((o) => o.userId === user.id) : []),
    [orders, user],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (searching) return;
    const id = normalizeOrderId(orderNumber);
    if (!id || id === 'NC-') {
      showToast('Enter your order number — it looks like NC-7K2M4P.', 'error');
      return;
    }
    setNotFound(false);
    setSearching(true);

    // Brief lookup pause so the shimmer reads as a real search.
    window.setTimeout(() => {
      const found = listOrders().find((o) => o.id === id) ?? getOrder(id);
      const owns = !!user && !!found && found.userId === user.id;
      const verified = !!found && (owns || contactMatchesOrder(found, contact));
      setSearching(false);
      if (found && verified) {
        navigate(`/track/${found.id}`);
      } else {
        setNotFound(true);
        showToast("We couldn't find that order — check the details and retry.", 'error');
      }
    }, 450);
  };

  const inputClass =
    'w-full rounded-xl border border-blush bg-porcelain px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-berry focus:outline-none';

  return (
    <div>
      {/* Gradient header band (compact home-hero recipe) */}
      <motion.section
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: -24 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden px-4 py-12 text-center"
        style={{
          background:
            'radial-gradient(circle at 20% 30%, rgba(211,190,145,0.4) 0%, transparent 50%), linear-gradient(135deg, #F4EEDF 0%, #E3D5BC 50%, #F4EEDF 100%)',
        }}
      >
        <span className="script block text-[1.15rem] text-rose-mid">where&apos;s my crown?</span>
        <h1 className="mt-1 inline-block font-display text-[1.85rem] font-bold text-berry">
          Track Your Order
          <span
            aria-hidden="true"
            className="mx-auto mt-3 block h-[3px] w-[60px] rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
            }}
          />
        </h1>
        <p className="mt-2 text-sm text-rose-deep">
          Follow your crown from our workshop to your door.
        </p>
      </motion.section>

      <div className="space-y-6 px-4 pb-10 pt-6">
        {/* Lookup card */}
        <motion.form
          onSubmit={submit}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: reduced ? 0 : 0.15 }}
          className="rounded-[20px] border border-blush bg-white p-5 shadow-[0_10px_40px_rgba(33,27,22,0.15)]"
        >
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: reduced ? 0 : 0.06 } },
            }}
            className="space-y-3"
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <label
                htmlFor="track-order-number"
                className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[1.5px] text-rose-mid"
              >
                Order number
              </label>
              <input
                id="track-order-number"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="NC-7K2M4P"
                autoComplete="off"
                className={inputClass}
              />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <label
                htmlFor="track-contact"
                className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[1.5px] text-rose-mid"
              >
                Phone or email used at checkout
              </label>
              <input
                id="track-contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="082 555 0147 or you@example.com"
                autoComplete="off"
                className={inputClass}
              />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <button
                type="submit"
                disabled={searching}
                className="btn-primary min-h-[48px] w-full disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:scale-100"
              >
                {searching ? (
                  <>
                    <Icon
                      name="progress_activity"
                      size={1.05}
                      className="animate-[spin_1s_linear_infinite]"
                    />
                    Finding your crown…
                  </>
                ) : (
                  <>
                    <Icon name="search" size={1.05} />
                    Find My Crown
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>

          <AnimatePresence>
            {notFound && (
              <motion.p
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-3 rounded-xl border-l-4 border-gold bg-porcelain px-3 py-2.5 text-[0.78rem] leading-relaxed text-berry-deep"
              >
                We couldn&apos;t find that order. Check the number and the phone/email you
                used at checkout, then try again.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.form>

        {/* Signed-in: your orders list (skip lookup) */}
        {user && (
          <motion.section
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: reduced ? 0 : 0.25 }}
          >
            <h2 className="font-display text-lg font-bold text-berry">Your orders</h2>
            <p className="script text-sm text-rose-mid">signed in — no lookup needed</p>

            {myOrders.length === 0 ? (
              <div className="mt-3 rounded-[20px] border border-blush bg-white p-5 text-center shadow-[0_10px_40px_rgba(33,27,22,0.15)]">
                <p className="text-sm text-charcoal/75">
                  No orders on this account yet — your first crown is waiting.
                </p>
                <Link to="/" className="btn-primary mt-3">
                  Shop Wigs
                </Link>
              </div>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {myOrders.map((o, i) => (
                  <motion.li
                    key={o.id}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
                    animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: reduced ? 0 : 0.3 + i * 0.06 }}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/track/${o.id}`)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-blush bg-white p-3.5 text-left shadow-[0_4px_20px_rgba(211,190,145,0.25)] transition-transform hover:-translate-y-0.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[0.95rem] font-bold text-berry">
                          {o.id}
                        </span>
                        <span className="block text-[0.68rem] text-charcoal/70">
                          {formatDateTime(o.createdAt)} ·{' '}
                          {o.items.reduce((n, it) => n + it.qty, 0)} item
                          {o.items.reduce((n, it) => n + it.qty, 0) === 1 ? '' : 's'} ·{' '}
                          <span className="font-display font-bold text-berry">
                            {formatPrice(o.total)}
                          </span>
                        </span>
                        <span className="mt-1.5 inline-block">
                          <StatusChip status={chipStatus(o.status)} />
                        </span>
                      </span>
                      <Icon name="chevron_right" size={1.3} className="shrink-0 text-rose-mid" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.section>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Order detail (/track/:orderId) — tracker.md §2–§6
   ============================================================ */

function CancelledCard({ order }: { order: Order }) {
  return (
    <section className="rounded-[20px] border-2 border-plum bg-white p-5 text-center shadow-[0_10px_40px_rgba(33,27,22,0.15)]">
      <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-plum/40 text-plum">
        <Icon name="cancel" size={1.6} />
      </span>
      <StatusChip status="cancelled" />
      <h2 className="mt-2 font-display text-xl font-bold text-plum">This order was cancelled</h2>
      <p className="mx-auto mt-1 max-w-[300px] text-sm text-charcoal/75">
        Questions?{' '}
        <a
          href={whatsappOrderLink(order.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-berry underline underline-offset-4"
        >
          Chat with us
        </a>{' '}
        and we&apos;ll sort it out for you.
      </p>
      <Link to="/" className="btn-primary mt-4">
        Start a Fresh Order
      </Link>
    </section>
  );
}

/** Payment status row card (mirrors Payment page assumptions). */
function PaymentCard({ order }: { order: Order }) {
  const paid = order.status !== 'order_received' && order.status !== 'cancelled';
  return (
    <section className="rounded-[20px] border border-blush bg-white p-4 shadow-[0_10px_40px_rgba(33,27,22,0.15)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-petal to-berry text-white">
          <Icon name={order.paymentMethod === 'payshap' ? 'payments' : 'phone_iphone'} size={1.1} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-charcoal">
            {order.paymentMethod === 'payshap' ? 'PayShap' : 'Capitec cellphone pay'}
          </h2>
          <p className="text-[0.72rem] text-rose-deep">
            {order.paymentMode === 'request'
              ? 'We requested the payment from you'
              : 'You sent the payment to us'}
            {order.paymentRef ? ` · ${order.paymentRef}` : ''}
          </p>
        </div>
        {paid ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[1px] text-success">
            <Icon name="check_circle" size={0.8} />
            Paid
          </span>
        ) : (
          <span className="inline-flex animate-[ncPulse_1.6s_ease-in-out_infinite] items-center gap-1 rounded-full border border-gold/40 bg-gold-soft px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[1px] text-[#8a6d00]">
            <Icon name="hourglass_top" size={0.8} />
            Awaiting
          </span>
        )}
      </div>
      {!paid && (
        <Link
          to={`/payment/${order.id}`}
          className="btn-primary mt-3 min-h-[48px] w-full"
        >
          <Icon name="lock" size={1} />
          Complete Payment — {formatPrice(order.total)}
        </Link>
      )}
    </section>
  );
}

/** Verify gate for direct /track/:orderId links — same rule as the lookup. */
function VerifyGate({
  order,
  onVerified,
}: {
  order: Order;
  onVerified: () => void;
}) {
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (contactMatchesOrder(order, contact)) {
      onVerified();
    } else {
      setError("That doesn't match the email or phone on this order. Try again.");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center gap-4 px-6 py-16 text-center"
    >
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_8px_25px_rgba(33,27,22,0.35)]"
        style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
      >
        <Icon name="lock" size={1.7} />
      </span>
      <h1 className="font-display text-2xl font-bold text-berry">Verify it&apos;s your order</h1>
      <p className="max-w-[320px] text-sm leading-relaxed text-rose-deep">
        Order <strong className="text-berry">{order.id}</strong> is private. Enter the email or
        phone number used at checkout to view its journey.
      </p>
      <form onSubmit={submit} className="flex w-full max-w-[320px] flex-col gap-3">
        <input
          value={contact}
          onChange={(e) => {
            setContact(e.target.value);
            setError('');
          }}
          placeholder="Email or phone used at checkout"
          className="w-full rounded-xl border border-blush bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-mid focus:ring-2 focus:ring-rose-petal/40"
        />
        {error && (
          <p role="alert" className="rounded-xl border border-gold bg-gold-soft/40 px-3 py-2 text-xs font-medium text-berry-deep">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary">
          <Icon name="verified_user" size={1} />
          View My Order
        </button>
      </form>
      <Link to="/track" className="text-sm font-semibold text-berry underline underline-offset-4">
        Back to lookup
      </Link>
    </motion.div>
  );
}

function TrackDetail({ orderId }: { orderId: string }) {
  const { showToast } = useApp();
  const orders = useOrders();
  const user = useCurrentUser();
  const reduced = useReducedMotion();
  const [verified, setVerified] = useState(false);

  // Live data comes from useOrders(); the interval + focus refresh re-read
  // the store so an admin status change is picked up promptly.
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener('focus', bump);
    const iv = window.setInterval(bump, 15000);
    return () => {
      window.removeEventListener('focus', bump);
      window.clearInterval(iv);
    };
  }, []);

  const order = orders.find((o) => o.id === orderId) ?? getOrder(orderId);

  // Celebrate status moves with a toast (live poll/refresh feedback).
  const prevStatus = useRef(order?.status);
  useEffect(() => {
    if (order && prevStatus.current && prevStatus.current !== order.status) {
      showToast(`Your crown moved to: ${STATUS_LABELS[order.status]}`, 'info');
    }
    prevStatus.current = order?.status;
  }, [order, showToast]);

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_8px_25px_rgba(33,27,22,0.35)]"
          style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
        >
          <Icon name="search_off" size={1.7} />
        </span>
        <h1 className="font-display text-2xl font-bold text-berry">Order not found</h1>
        <p className="max-w-[320px] rounded-xl border-l-4 border-gold bg-white px-3 py-2.5 text-left text-[0.8rem] leading-relaxed text-berry-deep">
          We couldn&apos;t find order <strong>{orderId}</strong>. Check the number and the
          phone/email used at checkout, then retry.
        </p>
        <Link to="/track" className="btn-primary">
          <Icon name="search" size={1} />
          Try the Lookup
        </Link>
      </div>
    );
  }

  // Privacy gate: direct links require the checkout contact — the owner
  // (signed in) and admins pass automatically. Guests verify once.
  const isOwner = !!user && (order.userId === user.id || isAdminEmail(user.email));
  if (!isOwner && !verified) {
    return <VerifyGate order={order} onVerified={() => setVerified(true)} />;
  }

  const cancelled = order.status === 'cancelled';
  const shipped =
    order.status === 'shipped' ||
    order.status === 'delivered' ||
    order.statusHistory.some((h) => h.status === 'shipped');

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-4 px-4 py-5"
    >
      <Link
        to="/track"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-berry"
      >
        <Icon name="chevron_left" size={1.1} />
        All orders
      </Link>

      <OrderSummaryCard order={order} />

      {cancelled ? (
        <CancelledCard order={order} />
      ) : (
        <>
          <JourneyTimeline order={order} />
          <LatePromiseMeter order={order} />
          {shipped && <CourierCard order={order} />}
          <PaymentCard order={order} />
        </>
      )}

      <ConciergeCard
        orderId={order.id}
        persona="Dr. Swift"
        role="Inventory & Logistics"
        avatarSrc="/avatar-swift.png"
        heading="Questions about this order?"
        note="The Director routes tracker chats to Dr. Swift automatically — she knows every parcel by name."
      />

      <div className="pb-6 text-center">
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-berry underline underline-offset-4"
        >
          <Icon name="storefront" size={1} />
          Continue Shopping
        </Link>
      </div>
    </motion.div>
  );
}

export default function Track() {
  const { orderId } = useParams();
  return orderId ? <TrackDetail orderId={normalizeOrderId(orderId)} /> : <TrackLookup />;
}
