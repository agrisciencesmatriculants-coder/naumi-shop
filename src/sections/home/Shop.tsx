import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CATEGORY_FILTERS,
  CATEGORY_META,
  DELIVERY_BADGE,
  PRODUCTS,
  formatPrice,
} from '@/lib/catalog';
import type { CategoryFilter, Product } from '@/lib/catalog';
import { useApp } from '@/store/AppContext';
import Icon from '@/components/Icon';
import ProductImage from '@/components/ProductImage';
import { openConcierge } from '@/components/Concierge';
import { cn } from '@/lib/utils';

/** Approved page badge gradient variants. */
const BADGE_STYLES: Record<NonNullable<Product['badge']>, string> = {
  Bestseller: 'linear-gradient(135deg, #211B16, #151110)',
  Popular: 'linear-gradient(135deg, #7A6B59, #211B16)',
  Premium: 'linear-gradient(135deg, #D4AF37, #211B16)',
  New: 'linear-gradient(135deg, #D4AF37, #B8902A)',
  'Best Value': 'linear-gradient(135deg, #2D8659, #1A5A3A)',
};

function HeartButton({ product }: { product: Product }) {
  const { isLiked, toggleLike } = useApp();
  const liked = isLiked(product.id);
  const [pop, setPop] = useState(false);

  return (
    <motion.button
      type="button"
      aria-label={liked ? `Unlike ${product.name}` : `Like ${product.name}`}
      aria-pressed={liked}
      onClick={(e) => {
        e.stopPropagation();
        toggleLike(product.id);
        setPop(true);
        window.setTimeout(() => setPop(false), 300);
      }}
      animate={pop ? { scale: [1, 1.3, 1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'absolute right-3.5 top-3.5 z-[3] flex h-[38px] w-[38px] items-center justify-center rounded-full backdrop-blur transition-colors',
        liked
          ? 'bg-gradient-to-br from-berry to-berry-deep text-white'
          : 'bg-white/90 text-berry hover:bg-berry hover:text-white',
      )}
    >
      <Icon name={liked ? 'favorite' : 'favorite_border'} size={1.1} />
    </motion.button>
  );
}

function ProductCard({
  product,
  index,
  onQuickView,
}: {
  product: Product;
  index: number;
  onQuickView: (p: Product) => void;
}) {
  const { addToCart } = useApp();
  const fast = product.category === 'bob';

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, ease: 'easeOut', delay: (index % 3) * 0.1 }}
      onClick={() => onQuickView(product)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-rose-petal/40 bg-white shadow-card transition-all duration-300 hover:-translate-y-3 hover:shadow-float"
    >
      {/* top gradient bar */}
      <div className="absolute left-0 right-0 top-0 z-[3] h-1 origin-left scale-x-0 bg-gradient-to-r from-rose-petal via-berry to-gold transition-transform duration-500 group-hover:scale-x-100" />

      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-blush to-rose-petal">
        {product.badge && (
          <span
            className="absolute left-3.5 top-3.5 z-[3] rounded-full px-3.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[1px] text-white shadow-[0_4px_12px_rgba(33,27,22,0.3)]"
            style={{ background: BADGE_STYLES[product.badge] }}
          >
            {product.badge}
          </span>
        )}
        <HeartButton product={product} />
        <ProductImage
          src={product.image}
          alt={`${product.name} - NaumiCrowns`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
          eager={index === 0}
        />
      </div>

      <div className="flex grow flex-col p-5">
        <span className="text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-rose-mid">
          {CATEGORY_META[product.category].tag}
        </span>
        <h3 className="my-2 font-display text-xl font-semibold text-charcoal">{product.name}</h3>
        <span
          className={cn(
            'my-2 inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold',
            fast
              ? 'border-success/20 bg-success/10 text-success'
              : 'border-berry/15 bg-blush text-berry',
          )}
        >
          <Icon name="local_shipping" size={0.85} />
          {DELIVERY_BADGE}
        </span>
        <p className="mt-auto pt-2 font-display text-lg font-bold text-berry">
          {formatPrice(product.price)}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            addToCart(product);
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-berry to-berry-deep py-3 text-[0.85rem] font-semibold uppercase tracking-[1px] text-white transition-all hover:-translate-y-0.5 hover:tracking-[2px]"
        >
          <Icon name="shopping_bag" size={1} />
          Add to Cart
        </button>
      </div>
    </motion.article>
  );
}

function QuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const { addToCart } = useApp();
  const [qty, setQty] = useState(1);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        className="fixed inset-0 z-[480] bg-charcoal/70 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-[490] flex items-center justify-center p-4">
        <motion.div
          role="dialog"
          aria-label={`${product.name} quick view`}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="max-h-[85dvh] w-full max-w-[420px] overflow-y-auto rounded-3xl bg-white shadow-float"
        >
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-3xl bg-gradient-to-br from-blush to-rose-petal">
          <ProductImage src={product.image} alt={product.name} className="h-full w-full object-cover object-top" eager />
          <button
            type="button"
            aria-label="Close quick view"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-berry backdrop-blur transition-colors hover:bg-berry hover:text-white"
          >
            <Icon name="close" size={1.1} />
          </button>
        </div>
        <div className="p-5">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-rose-mid">
            {CATEGORY_META[product.category].tag}
          </span>
          <div className="mt-1 flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl font-semibold text-charcoal">{product.name}</h3>
            <p className="font-display text-xl font-bold text-berry">{formatPrice(product.price)}</p>
          </div>
          <span
            className={cn(
              'my-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold',
              product.category === 'bob'
                ? 'border-success/20 bg-success/10 text-success'
                : 'border-berry/15 bg-blush text-berry',
            )}
          >
            <Icon name="local_shipping" size={0.85} />
            {DELIVERY_BADGE}
          </span>
          <p className="text-sm leading-relaxed text-charcoal/85">{product.description}</p>

          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blush text-berry transition-colors hover:bg-rose-petal hover:text-white"
            >
              <Icon name="remove" size={1} />
            </button>
            <span className="min-w-8 text-center font-display text-xl font-bold">{qty}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty((q) => q + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blush text-berry transition-colors hover:bg-rose-petal hover:text-white"
            >
              <Icon name="add" size={1} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              addToCart(product, qty);
              onClose();
            }}
            className="btn-primary mt-4 w-full"
          >
            <Icon name="shopping_bag" size={1.1} />
            Add to Cart — {formatPrice(product.price * qty)}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              openConcierge();
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold uppercase tracking-[1.5px] text-berry transition-colors hover:bg-blush"
          >
            <Icon name="chat_bubble" size={1} />
            Ask a stylist
          </button>
        </div>
        </motion.div>
      </div>
    </>
  );
}

/** The Wig Collection (#shop) — filters + live grid (home.md §5). */
export default function Shop() {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [quickView, setQuickView] = useState<Product | null>(null);

  const visible = filter === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter);

  return (
    <section id="shop" className="relative px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="section-title"
      >
        <span className="eyebrow">Handpicked for You</span>
        <h2>The Wig Collection</h2>
        <p>Quality-checked and ready to ship via Paxi &amp; PostNet.</p>
      </motion.div>

      {/* Category filter bar */}
      <div className="mb-10 flex flex-wrap justify-center gap-3">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={cn(
              'rounded-full border px-5 py-2.5 text-[0.82rem] font-semibold transition-all duration-300',
              filter === c.id
                ? 'border-berry bg-berry text-white shadow-soft'
                : 'border-rose-mid bg-white text-berry hover:border-rose-petal hover:bg-rose-petal hover:text-white',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <motion.div layout className="grid grid-cols-1 gap-5">
        <AnimatePresence mode="popLayout">
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} onQuickView={setQuickView} />
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {quickView && <QuickView product={quickView} onClose={() => setQuickView(null)} />}
      </AnimatePresence>
    </section>
  );
}
