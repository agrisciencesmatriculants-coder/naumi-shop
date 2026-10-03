import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { COURIERS, DELIVERY_BADGE, formatPrice } from '@/lib/catalog';
import Icon from '@/components/Icon';
import ProductImage from '@/components/ProductImage';
import { cn } from '@/lib/utils';

/**
 * Collapsible order summary card (checkout.md §4): line items with qty
 * steppers, totals with gold hairline dividers, delivery fee (FREE over
 * R2500), price-lock + late-promise notes.
 */
export default function OrderSummaryCard({
  courier,
  subtotal,
  deliveryFee,
  total,
}: {
  courier: 'paxi' | 'postnet';
  subtotal: number;
  deliveryFee: number;
  total: number;
}) {
  const { cart, cartCount, setQty, removeFromCart } = useApp();
  const [open, setOpen] = useState(true);
  const reduced = useReducedMotion();

  return (
    <section className="overflow-hidden rounded-[20px] border border-blush bg-white shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-petal to-berry text-white">
          <Icon name="receipt_long" size={1.05} />
        </span>
        <span className="flex-1 font-display text-base font-semibold text-charcoal">
          Your Crown Bag
          <span className="ml-2 text-xs font-normal text-rose-deep">
            {cartCount} item{cartCount === 1 ? '' : 's'}
          </span>
        </span>
        <Icon
          name="expand_more"
          size={1.2}
          className={cn('text-berry transition-transform duration-300', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="summary-body"
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {cart.map((item) => (
                    <motion.li
                      key={item.id}
                      layout="position"
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-3 rounded-2xl border border-blush bg-porcelain p-2.5"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                        <ProductImage
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          width={56}
                          height={56}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-charcoal">{item.name}</p>
                        <p className="text-xs text-rose-deep">
                          {item.qty} × {formatPrice(item.price)}
                        </p>
                        <div className="mt-1 flex items-center gap-2.5">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${item.name}`}
                            onClick={() => setQty(item.id, item.qty - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-blush text-berry transition-colors hover:bg-rose-petal hover:text-white"
                          >
                            <Icon name="remove" size={0.9} />
                          </button>
                          <span className="min-w-4 text-center text-sm font-semibold">{item.qty}</span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${item.name}`}
                            onClick={() => setQty(item.id, item.qty + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-blush text-berry transition-colors hover:bg-rose-petal hover:text-white"
                          >
                            <Icon name="add" size={0.9} />
                          </button>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="font-display text-sm font-bold text-berry">
                          {formatPrice(item.price * item.qty)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${item.name} from bag`}
                          onClick={() => removeFromCart(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-rose-deep transition-colors hover:bg-blush hover:text-berry"
                        >
                          <Icon name="delete" size={1} />
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[0.7rem] font-semibold text-success">
                <Icon name="local_shipping" size={0.85} />
                {DELIVERY_BADGE}
              </span>

              <div className="mt-3 space-y-1.5 text-sm">
                <motion.div
                  initial={reduced ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: reduced ? 0 : 0.4, ease: 'easeOut' }}
                  className="h-px origin-left bg-gradient-to-r from-transparent via-gold to-transparent"
                />
                <div className="flex items-center justify-between">
                  <span className="text-charcoal/80">Subtotal</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-charcoal/80">Delivery ({COURIERS[courier].name})</span>
                  {deliveryFee === 0 ? (
                    <span className="flex items-center gap-1.5 font-semibold text-success">
                      FREE
                      <span className="rounded-full bg-gold-soft px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[1px] text-[#8a6d00]">
                        over R2500
                      </span>
                    </span>
                  ) : (
                    <span className="font-semibold">{formatPrice(deliveryFee)}</span>
                  )}
                </div>
                <motion.div
                  initial={reduced ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: reduced ? 0 : 0.4, ease: 'easeOut', delay: 0.1 }}
                  className="h-px origin-left bg-gradient-to-r from-transparent via-gold to-transparent"
                />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <motion.span
                    key={total}
                    initial={reduced ? false : { scale: 1.08 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="font-display text-[1.4rem] font-bold text-berry"
                  >
                    {formatPrice(total)}
                  </motion.span>
                </div>
              </div>

              <p className="mt-2 text-[0.72rem] leading-relaxed text-rose-deep">
                Prices are locked at checkout. Later sales don't apply.
              </p>
              <p className="mt-1 flex items-start gap-1.5 text-[0.72rem] leading-relaxed text-charcoal/70">
                <Icon name="verified" size={0.85} className="mt-0.5 shrink-0 text-gold" />
                More than 6 business days → R50 off your next purchase — guaranteed.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
