import { motion, useReducedMotion } from 'framer-motion';
import type { Order } from '@/lib/backend';
import { COURIERS } from '@/lib/catalog';
import { useApp } from '@/store/AppContext';
import Icon from '@/components/Icon';
import { copyText, estimateRange, formatDay, trackingRef } from './track-utils';

/**
 * Courier card (tracker.md §5): berry gradient, bobbing courier icon in a
 * blush→rose-petal circle, ETA + copyable tracking reference, weekend note.
 * Shown once the order has shipped.
 */
export default function CourierCard({ order }: { order: Order }) {
  const { showToast } = useApp();
  const reduced = useReducedMotion();
  const courier = COURIERS[order.courier];
  const ref = trackingRef(order);
  const range = estimateRange(order);
  const delivered = order.status === 'delivered';

  const copyRef = async () => {
    const ok = await copyText(ref);
    showToast(ok ? 'Copied' : 'Could not copy — please long-press to copy', ok ? 'success' : 'error');
  };

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-[20px] p-4 text-white shadow-[0_10px_40px_rgba(33,27,22,0.15)]"
      style={{ background: 'linear-gradient(135deg, #211B16, #151110)' }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blush to-rose-petal text-berry shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
          style={{ animation: reduced ? undefined : 'iconBob 3s ease-in-out infinite' }}
        >
          <Icon name={order.courier === 'paxi' ? 'inventory_2' : 'local_shipping'} size={1.4} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold">{courier.name}</h2>
          <p className="text-[0.72rem] text-white/80">
            {delivered
              ? 'Delivered — we hope you love it'
              : `ETA ${formatDay(range.from)} – ${formatDay(range.to)} · ${courier.eta}`}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[1px] text-white/70">
            Tracking reference
          </p>
          <p className="truncate font-mono text-sm font-bold text-gold-soft">{ref}</p>
        </div>
        <button
          type="button"
          onClick={copyRef}
          aria-label="Copy tracking reference"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <Icon name="content_copy" size={1} />
        </button>
      </div>

      <p className="mt-2.5 flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-white/70">
        <Icon name="event_busy" size={0.85} className="mt-0.5 shrink-0" />
        No shipments on weekends or public holidays. Collect at {order.deliveryPoint}.
      </p>
    </motion.section>
  );
}
