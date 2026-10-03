import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { FREE_DELIVERY_THRESHOLD, formatPrice } from '@/lib/catalog';
import Icon from './Icon';
import ProductImage from './ProductImage';

/**
 * "Your Crown Bag" cart drawer (design.md §7.3): right slide-in panel
 * (max 400px), qty steppers, subtotal, delivery note, checkout CTA.
 */
export default function CartDrawer() {
  const { cart, cartCount, cartTotal, cartOpen, setCartOpen, setQty, removeFromCart } = useApp();
  const navigate = useNavigate();

  const close = () => setCartOpen(false);
  const goCheckout = () => {
    close();
    navigate('/checkout');
  };
  const keepShopping = () => {
    close();
    sessionStorage.setItem('nc_scroll', 'shop');
    navigate('/');
  };

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={close}
            className="fixed inset-0 z-[460] bg-charcoal/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 right-0 top-0 z-[470] flex w-full max-w-[400px] flex-col rounded-l-3xl bg-white shadow-[-20px_0_50px_rgba(33,27,22,0.25)]"
            role="dialog"
            aria-label="Your Crown Bag"
            style={{ right: 'max(0px, calc(50vw - 240px))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-blush px-5 py-4">
              <h2 className="font-display text-xl font-bold text-berry">
                Your Crown Bag{' '}
                <span className="font-sans text-sm font-medium text-rose-deep">
                  ({cartCount} {cartCount === 1 ? 'item' : 'items'})
                </span>
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close cart"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blush text-berry transition-colors hover:bg-rose-petal hover:text-white"
              >
                <Icon name="close" size={1.1} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <img src="/empty-bag.svg" alt="" width={160} height={160} className="opacity-90" />
                  <p className="font-display text-lg italic text-berry">
                    Your bag is waiting for its crown
                  </p>
                  <button type="button" onClick={keepShopping} className="btn-primary">
                    Shop The Collection
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  <AnimatePresence initial={false}>
                    {cart.map((item) => (
                      <motion.li
                        key={item.id}
                        layout="position"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: -16 }}
                        transition={{ duration: 0.3 }}
                        className="flex gap-3 rounded-2xl border border-blush bg-porcelain p-3"
                      >
                        <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl">
                          <ProductImage src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate font-display text-base font-semibold text-charcoal">
                              {item.name}
                            </p>
                            <button
                              type="button"
                              aria-label={`Remove ${item.name}`}
                              onClick={() => removeFromCart(item.id)}
                              className="text-rose-deep transition-colors hover:text-berry"
                            >
                              <Icon name="delete" size={1.1} />
                            </button>
                          </div>
                          <p className="font-display text-sm font-bold text-berry">
                            {formatPrice(item.price)}
                          </p>
                          <div className="mt-auto flex items-center gap-3 pt-1">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => setQty(item.id, item.qty - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-blush text-berry transition-colors hover:bg-rose-petal hover:text-white"
                            >
                              <Icon name="remove" size={0.9} />
                            </button>
                            <span className="min-w-5 text-center text-sm font-semibold">{item.qty}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => setQty(item.id, item.qty + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-blush text-berry transition-colors hover:bg-rose-petal hover:text-white"
                            >
                              <Icon name="add" size={0.9} />
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="border-t border-blush px-5 py-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-charcoal">Subtotal</span>
                  <span className="font-display text-xl font-bold text-berry">
                    {formatPrice(cartTotal)}
                  </span>
                </div>
                <p className="mb-3 text-xs text-rose-deep">
                  Delivery calculated at checkout — free over {formatPrice(FREE_DELIVERY_THRESHOLD)}.
                </p>
                <div className="mb-3 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
                <button type="button" onClick={goCheckout} className="btn-primary w-full">
                  Proceed to Checkout
                  <Icon name="arrow_forward" size={1.1} />
                </button>
                <button
                  type="button"
                  onClick={keepShopping}
                  className="mt-2 w-full rounded-full py-3 text-center text-sm font-semibold uppercase tracking-[1.5px] text-berry transition-colors hover:bg-blush"
                >
                  Keep Shopping
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
