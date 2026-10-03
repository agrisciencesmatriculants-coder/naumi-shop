import { Link, useParams } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { useOrders } from '@/lib/backend';
import { COURIERS, formatPrice } from '@/lib/catalog';
import { useApp } from '@/store/AppContext';
import Icon from '@/components/Icon';
import Petals from '@/components/Petals';
import ProductImage from '@/components/ProductImage';
import StatusChip from '@/components/StatusChip';
import BankDetailsCard from '@/components/checkout/BankDetailsCard';
import ConciergeCard from '@/components/track/ConciergeCard';
import {
  copyText,
  courierName,
  estimateRange,
  formatDay,
  normalizeOrderId,
  whatsappOrderLink,
} from '@/components/track/track-utils';

/** One-shot gold + rose-petal particle burst (10 particles, radial, 1.2s). */
function CelebrationBurst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const dist = 60 + (i % 3) * 18;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              scale: [0, 1.2, 0.3],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
            className="absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full"
            style={{ background: i % 2 === 0 ? '#D4AF37' : '#E3D5BC' }}
          />
        );
      })}
    </span>
  );
}

/** Gold pulsing "Awaiting Confirmation" chip (thankyou.md §2). */
function AwaitingChip() {
  return (
    <span className="inline-flex animate-[ncPulse_1.6s_ease-in-out_infinite] items-center gap-1.5 rounded-full border border-gold/40 bg-gold-soft px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[1px] text-[#8a6d00]">
      <Icon name="hourglass_top" size={0.85} />
      Awaiting Confirmation
    </span>
  );
}

const NEXT_STEPS = [
  {
    id: 'payment_confirmed',
    icon: 'payments',
    title: 'Payment Confirmed',
    text: 'Your payment is verified and locked in.',
    done: true,
  },
  {
    id: 'workshop_check',
    icon: 'fact_check',
    title: 'Workshop Check',
    text: 'We confirm stock & your size.',
    done: false,
  },
  {
    id: 'crafting',
    icon: 'content_cut',
    title: 'Crafting & Dispatch',
    text: 'Handcrafted in-house, then shipped via Paxi/PostNet.',
    done: false,
  },
  {
    id: 'delivered',
    icon: 'celebration',
    title: 'Delivered',
    text: '2 to 6 business working days.',
    done: false,
  },
] as const;

export default function ThankYou() {
  const { orderId } = useParams();
  const id = normalizeOrderId(orderId ?? '');
  const orders = useOrders();
  const order = orders.find((o) => o.id === id) ?? null;
  const { showToast } = useApp();
  const reduced = useReducedMotion();

  const copyId = async () => {
    const ok = await copyText(id);
    showToast(ok ? 'Copied' : 'Could not copy — please long-press to copy', ok ? 'success' : 'error');
  };

  /* ---------- order missing (e.g. storage cleared) ---------- */
  if (!order) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <img src="/thankyou-crown.svg" alt="" width={200} height={150} className="h-36 w-48" />
        <h1 className="font-display text-2xl font-bold text-berry">Thank you!</h1>
        <p className="max-w-[320px] text-sm text-charcoal/75">
          We couldn&apos;t load order <strong className="text-berry">{id || '—'}</strong> on this
          device. If you just checked out, your confirmation email has everything you need.
        </p>
        <div className="flex flex-col items-center gap-2">
          <Link to={id ? `/track/${id}` : '/track'} className="btn-primary">
            <Icon name="local_shipping" size={1.05} />
            Track My Order
          </Link>
          <Link to="/" className="text-sm font-semibold text-berry underline underline-offset-4">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const paid = order.status !== 'order_received' && order.status !== 'cancelled';
  const range = estimateRange(order);
  const courier = COURIERS[order.courier];

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="pb-10"
    >
      <Petals />

      {/* ============ §1 Celebration hero ============ */}
      <section
        className="relative overflow-hidden px-4 py-16 text-center"
        style={{
          background:
            'radial-gradient(circle at 20% 30%, rgba(211,190,145,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(244,238,223,0.6) 0%, transparent 50%), linear-gradient(135deg, #F4EEDF 0%, #E3D5BC 50%, #F4EEDF 100%)',
          backgroundSize: '200% 200%',
          animation: reduced ? undefined : 'heroGradient 15s ease infinite',
        }}
      >
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -60 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, duration: 0.7 }}
          className="relative mx-auto w-fit"
        >
          {!reduced && <CelebrationBurst />}
          <motion.div
            animate={reduced ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img
              src="/thankyou-crown.svg"
              alt="Your crown, on its way"
              width={320}
              height={240}
              className="h-40 w-auto"
            />
          </motion.div>
        </motion.div>

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: reduced ? 0 : 0.1 }}
          className="script mt-4 block text-[1.15rem] text-rose-mid"
        >
          you did it
        </motion.span>
        <motion.h1
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: reduced ? 0 : 0.2 }}
          className="mt-1 font-display text-[2rem] font-bold leading-tight text-berry"
        >
          Your Crown Is On Its Way.
        </motion.h1>
        <motion.p
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: reduced ? 0 : 0.35 }}
          className="mx-auto mt-2 max-w-[340px] text-sm leading-relaxed text-charcoal"
        >
          Thank you for shopping with NaumiCrowns. Every crown tells a story — yours just started.
        </motion.p>
      </section>

      <div className="space-y-6 px-4 pt-6">
        {/* ============ §2 Order card ============ */}
        <motion.section
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: reduced ? 0 : 0.3 }}
          className="relative overflow-hidden rounded-[20px] border border-blush bg-white p-4 shadow-[0_10px_40px_rgba(33,27,22,0.15)]"
        >
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-0 h-1"
            style={{ background: 'linear-gradient(90deg, #E3D5BC, #211B16, #D4AF37)' }}
          />

          <div className="flex items-start justify-between gap-3 pt-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="font-display text-lg font-bold text-berry">
                Order <span className="whitespace-nowrap">{order.id}</span>
              </p>
              <button
                type="button"
                onClick={copyId}
                aria-label="Copy order number"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-berry transition-colors hover:bg-rose-petal hover:text-white"
              >
                <Icon name="content_copy" size={1} />
              </button>
            </div>
            {paid ? <StatusChip status="payment_confirmed" /> : <AwaitingChip />}
          </div>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: reduced ? 0 : 0.06, delayChildren: 0.4 } },
            }}
            className="mt-3 space-y-2 border-t border-blush pt-3"
          >
            {order.items.map((item) => (
              <motion.li
                key={item.id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                className="flex items-center gap-3"
              >
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-blush">
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    width={44}
                    height={44}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.85rem] text-charcoal">
                  {item.name} <span className="text-rose-deep">× {item.qty}</span>
                </span>
                <span className="shrink-0 text-[0.8rem] font-medium text-charcoal/80">
                  {formatPrice(item.price * item.qty)}
                </span>
              </motion.li>
            ))}
          </motion.ul>

          <div className="mt-3 space-y-1.5 border-t border-blush pt-3 text-[0.8rem]">
            <p className="flex items-center gap-1.5 text-charcoal/80">
              <Icon name="location_on" size={0.95} className="shrink-0 text-berry" />
              {order.city} · {order.deliveryPoint}
            </p>
            <p className="flex items-center gap-1.5 text-charcoal/80">
              <Icon name="local_shipping" size={0.95} className="shrink-0 text-berry" />
              {courierName(order)} · {courier.eta} · ETA {formatDay(range.from)} –{' '}
              {formatDay(range.to)}
            </p>
            <p className="flex items-center justify-between pt-1">
              <span className="font-semibold text-charcoal">
                {paid ? 'Total paid' : 'Total due'}
              </span>
              <span className="font-display text-xl font-bold text-berry">
                {formatPrice(order.total)}
              </span>
            </p>
          </div>
        </motion.section>

        {/* Unpaid: payment instructions recap (BANK_DETAILS via shared card) */}
        {!paid && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: reduced ? 0 : 0.4 }}
            className="space-y-3"
          >
            {order.paymentMode === 'request' ? (
              <section className="rounded-[20px] border border-blush bg-white p-4 text-center shadow-[0_10px_40px_rgba(33,27,22,0.15)]">
                <h2 className="font-display text-base font-bold text-berry">
                  Approve the payment request
                </h2>
                <p className="mx-auto mt-1 max-w-[300px] text-[0.8rem] leading-relaxed text-charcoal/80">
                  We&apos;ve sent a {formatPrice(order.total)} request to your{' '}
                  {order.paymentMethod === 'payshap' ? 'PayShap ID' : 'Capitec number'}
                  {order.paymentRef ? ` (${order.paymentRef})` : ''}. Approve it in your banking
                  app and we start crafting.
                </p>
              </section>
            ) : (
              <BankDetailsCard reference={order.id} />
            )}
            <Link to={`/payment/${order.id}`} className="btn-secondary min-h-[48px] w-full">
              <Icon name="upload_file" size={1.05} />
              Finish Payment
            </Link>
          </motion.div>
        )}

        {/* ============ §3 What happens next ============ */}
        <motion.section
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-[20px] border border-blush bg-white p-5 shadow-[0_10px_40px_rgba(33,27,22,0.15)]"
        >
          <h2 className="font-display text-lg font-bold text-berry">What Happens Next</h2>
          <div className="relative mt-4">
            <div
              aria-hidden="true"
              className="absolute bottom-5 left-[17px] top-5 w-[3px] rounded-full bg-blush"
            />
            <motion.div
              aria-hidden="true"
              className="absolute left-[17px] top-5 w-[3px] origin-top rounded-full"
              style={{ background: 'linear-gradient(180deg, #E3D5BC, #211B16)' }}
              initial={reduced ? { height: '25%' } : { height: 0 }}
              whileInView={{ height: '25%' }}
              viewport={{ once: true }}
              transition={{ duration: reduced ? 0 : 0.8, ease: 'easeOut' }}
            />
            <ol className="relative space-y-5">
              {NEXT_STEPS.map((step, i) => (
                <motion.li
                  key={step.id}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
                  whileInView={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: reduced ? 0 : 0.1 + i * 0.08 }}
                  className="flex items-start gap-3.5"
                >
                  <span
                    className={
                      step.done
                        ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white'
                        : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-rose-petal bg-white text-rose-mid/60'
                    }
                  >
                    <Icon name={step.done ? 'check' : step.icon} size={1} />
                  </span>
                  <div>
                    <p
                      className={
                        step.done
                          ? 'text-[0.9rem] font-semibold text-charcoal'
                          : 'text-[0.9rem] font-medium text-charcoal/60'
                      }
                    >
                      {step.title}
                    </p>
                    <p className="text-[0.75rem] text-charcoal/60">{step.text}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>

          {/* verbatim promise strip */}
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-gold-soft/50 px-3 py-2.5 text-[0.78rem] leading-relaxed text-charcoal">
            <Icon name="verified" size={1} className="mt-0.5 shrink-0 text-gold" />
            <span>
              Delivery takes <strong className="font-semibold">2 to 6 business working days</strong>.
              If it takes more than 6 days, you get{' '}
              <strong className="font-semibold">R50 off</strong> your next purchase — guaranteed.
            </span>
          </p>
        </motion.section>

        {/* ============ §4 CTAs ============ */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: reduced ? 0 : 0.1 } },
          }}
          className="space-y-2.5"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
            <Link to={`/track/${order.id}`} className="btn-primary min-h-[48px] w-full">
              <Icon name="local_shipping" size={1.1} />
              Track My Order
            </Link>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
            <a
              href={whatsappOrderLink(order.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary min-h-[48px] w-full"
            >
              <Icon name="chat" size={1.05} />
              WhatsApp Us
            </a>
          </motion.div>
          <motion.div
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
            className="pt-1 text-center"
          >
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-berry underline underline-offset-4"
            >
              <Icon name="storefront" size={1} />
              Continue Shopping
            </Link>
          </motion.div>
        </motion.div>

        {/* ============ §5 Concierge nudge ============ */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: reduced ? 0 : 0.2 }}
        >
          <ConciergeCard
            orderId={order.id}
            persona="Stylist"
            role="NaumiCrowns Concierge"
            avatarSrc="/avatar-stylist-1.png"
            heading="A stylist is here if you need anything"
            note="From fit advice to delivery questions — your stylist is one tap away."
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
