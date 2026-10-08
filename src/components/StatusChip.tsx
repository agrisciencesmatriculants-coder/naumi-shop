import { cn } from '@/lib/utils';
import Icon from './Icon';

/** Order lifecycle stages (design.md §9) + side states. */
export type OrderStatus =
  | 'received'
  | 'payment_confirmed'
  | 'workshop_check'
  | 'crafting'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'attention';

const STATUS_META: Record<OrderStatus, { label: string; icon: string; className: string }> = {
  received: {
    label: 'Order Received',
    icon: 'receipt_long',
    className: 'bg-rose-mid/15 text-rose-mid border-rose-mid/30',
  },
  payment_confirmed: {
    label: 'Payment Confirmed',
    icon: 'payments',
    className: 'bg-success/10 text-success border-success/25',
  },
  workshop_check: {
    label: 'Workshop Check',
    icon: 'fact_check',
    className: 'bg-gold-soft/60 text-[#8a6d00] border-gold/40',
  },
  crafting: {
    label: 'Crafting',
    icon: 'content_cut',
    className: 'bg-rose-deep/10 text-rose-deep border-rose-deep/30',
  },
  shipped: {
    label: 'Shipped',
    icon: 'local_shipping',
    className: 'bg-berry/10 text-berry border-berry/25',
  },
  delivered: {
    label: 'Delivered',
    icon: 'check_circle',
    className: 'bg-success text-white border-success',
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'cancel',
    className: 'bg-transparent text-plum border-plum/40',
  },
  attention: {
    label: 'Attention Needed',
    icon: 'priority_high',
    className: 'bg-gold-soft text-[#8a6d00] border-gold animate-[ncPulse_1.6s_ease-in-out_infinite]',
  },
};

/**
 * Status chip — pill with icon + label (design.md §7.8).
 * Shared by tracker, admin and account pages.
 */
export default function StatusChip({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[1px]',
        meta.className,
        className,
      )}
    >
      <Icon name={meta.icon} size={0.85} />
      {meta.label}
    </span>
  );
}
