import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Order } from '@/lib/backend';
import Icon from '@/components/Icon';
import { businessDaysElapsed } from './track-utils';

/**
 * Late-delivery promise meter (tracker.md §4): glass blush card with the
 * verbatim promise, business-days progress (success → gold) over 6 days,
 * and the "R50 credit earned" chip once the promise kicks in.
 */
export default function LatePromiseMeter({ order }: { order: Order }) {
  const reduced = useReducedMotion();
  // Snapshot "now" once per mount so the meter is render-pure.
  const [now] = useState<number>(() => Date.now());
  const delivered = order.status === 'delivered';
  const end =
    order.statusHistory.find((h) => h.status === 'delivered')?.at ?? now;
  const elapsed = businessDaysElapsed(order.createdAt, end);
  const late = !!order.latePromiseNote || elapsed > 6;
  const pct = Math.min(1, elapsed / 6) * 100;

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-[20px] border border-rose-petal/40 bg-blush/60 p-4 backdrop-blur-md"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gold shadow-[0_4px_20px_rgba(211,190,145,0.25)]">
          <Icon name="verified" size={1.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-bold text-berry">Our Delivery Promise</h2>
          <p className="mt-1 text-[0.8rem] leading-relaxed text-charcoal">
            Delivery takes <strong className="font-semibold">2 to 6 business working days</strong>.
            If it takes more than 6 days, you get{' '}
            <strong className="font-semibold">R50 off</strong> your next purchase — guaranteed.
          </p>
        </div>
      </div>

      {/* progress bar + day markers */}
      <div className="mt-4">
        <div className="relative h-3 overflow-hidden rounded-full bg-[#F4EEDF] shadow-inner">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: late
                ? '#D4AF37'
                : 'linear-gradient(90deg, #2D8659, #D4AF37)',
            }}
            initial={reduced ? { width: `${pct}%` } : { width: 0 }}
            whileInView={{ width: `${late ? 100 : pct}%` }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: reduced ? 0 : 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="mt-1.5 flex justify-between">
          {Array.from({ length: 6 }, (_, i) => (
            <motion.span
              key={i}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: reduced ? 0 : 0.1 + i * 0.06 }}
              className={
                i + 1 <= Math.min(elapsed, 6)
                  ? 'text-[0.62rem] font-bold text-berry'
                  : 'text-[0.62rem] font-medium text-charcoal/40'
              }
            >
              {i + 1}
            </motion.span>
          ))}
        </div>
        <p className="mt-1 text-[0.68rem] text-charcoal/70">
          {delivered
            ? `Delivered in ${elapsed} business day${elapsed === 1 ? '' : 's'}.`
            : `${Math.min(elapsed, 6)} of 6 business days elapsed since your order.`}
        </p>
      </div>

      {late && (
        <motion.span
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[1px] text-plum"
        >
          <Icon name="redeem" size={0.9} />
          R50 credit earned
        </motion.span>
      )}
    </motion.section>
  );
}
