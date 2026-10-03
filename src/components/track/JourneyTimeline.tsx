import { motion, useReducedMotion } from 'framer-motion';
import { STATUS_STEPS, formatDateTime } from '@/lib/backend';
import type { Order, OrderStatus } from '@/lib/backend';
import Icon from '@/components/Icon';
import { CrownGlyph } from '@/components/CrownLogo';
import { cn } from '@/lib/utils';
import { courierShort, trackingRef } from './track-utils';

/** Per-stage helper line (tracker.md §3). */
function helperText(step: OrderStatus, order: Order): string {
  switch (step) {
    case 'order_received':
      return 'We received your order and locked your price.';
    case 'payment_confirmed':
      return 'Payment received — thank you.';
    case 'workshop_check':
      return 'We confirm stock & your size.';
    case 'crafting':
      return 'Handcrafting your crown in-house.';
    case 'shipped':
      return `${courierShort(order)} · Ref ${trackingRef(order)} · collect at ${order.deliveryPoint}`;
    case 'delivered':
      return 'Enjoy your crown — every crown tells a story.';
    default:
      return '';
  }
}

/** One-shot gold sparkle burst around the delivered node (6 particles, 0.8s). */
function SparkleBurst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * 34,
              y: Math.sin(angle) * 34,
              scale: [0, 1, 0.4],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full"
            style={{ background: i % 2 === 0 ? '#D4AF37' : '#E3D5BC' }}
          />
        );
      })}
    </span>
  );
}

/**
 * The Crown Journey timeline (tracker.md §3): left rail with animated
 * gradient fill, completed / current (gold halo) / future node states and
 * a success + sparkle finale when delivered.
 */
export default function JourneyTimeline({ order }: { order: Order }) {
  const reduced = useReducedMotion();
  const currentIdx = STATUS_STEPS.findIndex((s) => s.id === order.status);
  const isDelivered = order.status === 'delivered';
  const idx = currentIdx < 0 ? 0 : currentIdx;
  const fillPct = isDelivered ? 100 : (idx / (STATUS_STEPS.length - 1)) * 100;

  return (
    <section
      aria-label="Order journey"
      className="rounded-[20px] border border-blush bg-white p-5 shadow-[0_10px_40px_rgba(33,27,22,0.15)]"
    >
      <h2 className="font-display text-lg font-bold text-berry">The Crown Journey</h2>
      <p className="script text-sm text-rose-mid">from our workshop to your door</p>

      <div className="relative mt-5">
        {/* rail track + animated fill */}
        <div
          aria-hidden="true"
          className="absolute bottom-7 left-[26.5px] top-7 w-[3px] rounded-full bg-blush"
        />
        <motion.div
          aria-hidden="true"
          className="absolute left-[26.5px] top-7 w-[3px] origin-top rounded-full"
          style={{ background: 'linear-gradient(180deg, #E3D5BC, #211B16)' }}
          initial={reduced ? { height: `${fillPct}%` } : { height: '0%' }}
          animate={{ height: `${fillPct}%` }}
          transition={{ duration: reduced ? 0 : 1, ease: 'easeOut' }}
        />

        <ol className="relative space-y-6">
          {STATUS_STEPS.map((step, i) => {
            const completed = i < idx || isDelivered;
            const current = i === idx && !isDelivered;
            const entry = order.statusHistory.find((h) => h.status === step.id);
            const finalDone = isDelivered && i === STATUS_STEPS.length - 1;

            return (
              <motion.li
                key={step.id}
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  ease: 'easeOut',
                  delay: reduced ? 0 : 0.05 * i,
                }}
                className="flex items-start gap-4"
              >
                {/* node */}
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                  {current && !reduced && (
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-[3px] rounded-full border-2 border-gold"
                      animate={{
                        boxShadow: [
                          '0 0 0 0 rgba(212,175,55,0.0)',
                          '0 0 0 8px rgba(212,175,55,0.2)',
                          '0 0 0 0 rgba(212,175,55,0.0)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  <motion.span
                    key={current ? `current-${order.status}` : step.id}
                    initial={
                      reduced || !current ? false : { scale: 0.6 }
                    }
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                    className={cn(
                      'relative flex items-center justify-center rounded-full',
                      current ? 'h-12 w-12 ring-2 ring-gold' : 'h-10 w-10',
                      finalDone && 'text-gold-soft',
                      completed &&
                        !finalDone &&
                        'text-white shadow-[0_4px_15px_rgba(33,27,22,0.4)]',
                      current && 'text-white shadow-[0_4px_15px_rgba(33,27,22,0.4)]',
                      !completed && !current && 'border-2 border-rose-petal bg-white',
                    )}
                    style={
                      finalDone
                        ? { background: 'linear-gradient(135deg, #2D8659, #1f6a45)' }
                        : completed
                          ? { background: 'linear-gradient(135deg, #211B16, #151110)' }
                          : current
                            ? { background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }
                            : undefined
                    }
                  >
                    {finalDone ? (
                      <CrownGlyph size={20} />
                    ) : (
                      <Icon
                        name={step.icon}
                        size={current ? 1.3 : 1.1}
                        className={cn(!completed && !current && 'text-rose-mid/60')}
                      />
                    )}
                    {finalDone && !reduced && <SparkleBurst />}
                  </motion.span>
                  {/* check overlay on completed nodes */}
                  {completed && (
                    <motion.span
                      initial={reduced ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: reduced ? 0 : 0.3 + 0.05 * i }}
                      className={cn(
                        'absolute flex items-center justify-center rounded-full border-2 border-white bg-success text-white',
                        current ? 'bottom-1 right-1 h-4 w-4' : 'bottom-2 right-2 h-4 w-4',
                      )}
                    >
                      <Icon name="check" size={0.6} />
                    </motion.span>
                  )}
                </span>

                {/* labels */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        'text-[0.92rem]',
                        completed && 'font-semibold text-charcoal',
                        current && 'font-bold text-berry',
                        !completed && !current && 'font-medium text-charcoal/50',
                      )}
                    >
                      {step.label}
                    </p>
                    {current && (
                      <span className="rounded-full bg-blush px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[1px] text-berry">
                        In progress
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      'mt-0.5 text-[0.78rem] leading-relaxed text-charcoal/75',
                      !completed && !current && 'text-charcoal/40',
                    )}
                  >
                    {helperText(step.id, order)}
                  </p>
                  {entry?.note && (
                    <p className="mt-0.5 text-[0.72rem] italic text-rose-deep">{entry.note}</p>
                  )}
                  {entry && (
                    <p className="mt-0.5 text-[0.72rem] text-rose-deep">
                      {formatDateTime(entry.at)}
                    </p>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
