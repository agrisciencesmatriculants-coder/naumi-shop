import { motion, useReducedMotion } from 'framer-motion';
import type { Order } from '@/lib/backend';
import { formatDateTime } from '@/lib/backend';
import { formatPrice } from '@/lib/catalog';
import Icon from '@/components/Icon';
import StatusChip from '@/components/StatusChip';
import ProductImage from '@/components/ProductImage';
import { chipStatus, courierName, estimateRange, formatDay } from './track-utils';

/**
 * Order summary card (tracker.md §2): white card, 4px gradient strip,
 * order number + micro-labels, item thumb circles, status chip and the
 * estimated-delivery line computed from courier + processing days.
 */
export default function OrderSummaryCard({ order }: { order: Order }) {
  const reduced = useReducedMotion();
  const cancelled = order.status === 'cancelled';
  const deliveredEntry = order.statusHistory.find((h) => h.status === 'delivered');
  const range = estimateRange(order);
  const itemCount = order.items.reduce((n, i) => n + i.qty, 0);

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-[20px] border border-blush bg-white p-4 shadow-[0_10px_40px_rgba(33,27,22,0.15)]"
    >
      {/* top gradient strip */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 h-1"
        style={{ background: 'linear-gradient(90deg, #E3D5BC, #211B16, #D4AF37)' }}
      />

      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold text-berry">{order.id}</h2>
          <p className="mt-0.5 text-[0.7rem] text-charcoal/80">
            {formatDateTime(order.createdAt)} · {order.city} · {courierName(order)}
          </p>
          <p className="text-[0.7rem] text-charcoal/60">
            {itemCount} item{itemCount === 1 ? '' : 's'} ·{' '}
            <span className="font-display font-bold text-berry">{formatPrice(order.total)}</span>
          </p>
        </div>
        <motion.span
          key={order.status}
          initial={reduced ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="shrink-0"
        >
          <StatusChip status={chipStatus(order.status)} />
        </motion.span>
      </div>

      {/* item thumbs — 44px circles with blush ring */}
      <div className="mt-3 flex items-center gap-2">
        {order.items.slice(0, 5).map((item) => (
          <span
            key={item.id}
            title={`${item.name} × ${item.qty}`}
            className="h-11 w-11 overflow-hidden rounded-full border-2 border-blush shadow-[0_4px_20px_rgba(211,190,145,0.25)]"
          >
            <ProductImage
              src={item.image}
              alt={item.name}
              className="h-full w-full object-cover"
              width={44}
              height={44}
            />
          </span>
        ))}
        {order.items.length > 5 && (
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-blush bg-porcelain text-[0.7rem] font-bold text-berry">
            +{order.items.length - 5}
          </span>
        )}
      </div>

      {/* estimated delivery */}
      {!cancelled && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-gold-soft/50 px-3 py-2 text-[0.75rem] font-medium text-charcoal">
          <Icon name="calendar_month" size={0.95} className="shrink-0 text-gold" />
          {deliveredEntry ? (
            <>
              Delivered on{' '}
              <span className="font-semibold text-berry">{formatDay(deliveredEntry.at)}</span>
            </>
          ) : (
            <>
              Estimated:{' '}
              <span className="font-semibold text-berry">
                {formatDay(range.from)} – {formatDay(range.to)}
              </span>
            </>
          )}
        </p>
      )}
    </motion.section>
  );
}
