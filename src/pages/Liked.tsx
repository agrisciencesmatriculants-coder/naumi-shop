import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { CATEGORY_META, formatPrice, getProduct } from '@/lib/catalog';
import type { Product } from '@/lib/catalog';
import Icon from '@/components/Icon';
import ProductImage from '@/components/ProductImage';
import { openConcierge } from '@/components/Concierge';

/* ============================================================
   "Added {x}d ago" — the store keeps liked ids only, so we keep
   a lightweight id → timestamp sidecar in localStorage.
   ============================================================ */

const LIKED_AT_KEY = 'nc_liked_at';

function readLikedAt(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LIKED_AT_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/* Tiny external store: stamps newly-liked ids, drops unliked ones.
   Mirrors the useSyncExternalStore pattern used by src/lib/backend.ts. */
const likedAtListeners = new Set<() => void>();
let likedAtCache: Record<string, number> = readLikedAt();

function subscribeLikedAt(cb: () => void): () => void {
  likedAtListeners.add(cb);
  return () => {
    likedAtListeners.delete(cb);
  };
}

function getLikedAt(): Record<string, number> {
  return likedAtCache;
}

/** External-system sync only (localStorage) — no setState in the effect body. */
function stampLikedAt(liked: string[]): void {
  let changed = false;
  const next: Record<string, number> = {};
  for (const id of liked) {
    if (likedAtCache[id]) {
      next[id] = likedAtCache[id];
    } else {
      next[id] = Date.now();
      changed = true;
    }
  }
  if (changed || Object.keys(likedAtCache).length !== liked.length) {
    likedAtCache = next;
    try {
      localStorage.setItem(LIKED_AT_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
    likedAtListeners.forEach((cb) => cb());
  }
}

function useLikedAt(liked: string[]): Record<string, number> {
  useEffect(() => {
    stampLikedAt(liked);
  }, [liked]);
  return useSyncExternalStore(subscribeLikedAt, getLikedAt, getLikedAt);
}

function addedAgoLabel(at: number | undefined): string {
  if (!at) return 'Added recently';
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return 'Added today';
  if (days === 1) return 'Added 1d ago';
  return `Added ${days}d ago`;
}

/** Stylist avatar with graceful fallback while the asset is generated. */
function StylistAvatar() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-soft"
        style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
      >
        <Icon name="face" size={1.4} />
      </span>
    );
  }
  return (
    <img
      src="/avatar-stylist-1.png"
      alt="NaumiCrowns stylist"
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-soft"
    />
  );
}

function LikedCard({
  product,
  index,
  likedAt,
}: {
  product: Product;
  index: number;
  likedAt?: number;
}) {
  const { toggleLike, addToCart, cart } = useApp();
  const reduced = useReducedMotion();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = cart.some((i) => i.id === product.id) || justAdded;

  const handleAdd = () => {
    addToCart(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.08 }}
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-rose-petal/40 bg-white shadow-card transition-all duration-300 hover:-translate-y-3 hover:shadow-float"
    >
      {/* top gradient bar */}
      <div className="absolute left-0 right-0 top-0 z-[3] h-1 origin-left scale-x-0 bg-gradient-to-r from-rose-petal via-berry to-gold transition-transform duration-500 group-hover:scale-x-100" />

      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-blush to-rose-petal">
        {product.badge && (
          <span className="absolute left-3.5 top-3.5 z-[3] rounded-full bg-gradient-to-br from-rose-deep to-berry px-3.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[1px] text-white shadow-[0_4px_12px_rgba(33,27,22,0.3)]">
            {product.badge}
          </span>
        )}
        {/* Filled heart — tapping un-likes (card collapses out via AnimatePresence) */}
        <motion.button
          type="button"
          aria-label={`Remove ${product.name} from liked`}
          whileTap={{ scale: 0.8 }}
          onClick={() => toggleLike(product.id)}
          className="absolute right-3.5 top-3.5 z-[3] flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gradient-to-br from-berry to-berry-deep text-white transition-colors"
        >
          <Icon name="favorite" size={1.1} />
        </motion.button>
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
        <div className="my-2 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-xl font-semibold text-charcoal">{product.name}</h3>
          <p className="font-display text-lg font-bold text-berry">{formatPrice(product.price)}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[0.7rem] text-rose-deep">
          <Icon name="schedule" size={0.8} />
          {addedAgoLabel(likedAt)}
        </span>
        <motion.button
          type="button"
          onClick={handleAdd}
          animate={justAdded && !reduced ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          className={
            inCart
              ? 'mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-success to-[#1A5A3A] py-3 text-[0.85rem] font-semibold uppercase tracking-[1px] text-white'
              : 'mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-berry to-berry-deep py-3 text-[0.85rem] font-semibold uppercase tracking-[1px] text-white transition-all hover:-translate-y-0.5 hover:tracking-[2px]'
          }
        >
          <Icon name={inCart ? 'check' : 'shopping_bag'} size={1} />
          {inCart ? 'In your bag' : 'Add to Cart'}
        </motion.button>
      </div>
    </motion.article>
  );
}

/**
 * Liked — the queen's wishlist (design/liked.md): header band,
 * staggered product grid with un-like collapse + add-to-cart morph,
 * floating empty state and a concierge nudge card.
 */
export default function Liked() {
  const { liked } = useApp();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const likedAt = useLikedAt(liked);

  const products = useMemo(
    () =>
      liked
        .map((id) => getProduct(id))
        .filter((p): p is Product => p !== undefined)
        .reverse(), // most recently liked first
    [liked],
  );

  const goShop = () => {
    sessionStorage.setItem('nc_scroll', 'shop');
    navigate('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* ===== Section 1 — header band ===== */}
      <motion.section
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: -24 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="px-4 py-10 text-center"
        style={{ background: 'linear-gradient(135deg, #F4EEDF 0%, #E3D5BC 100%)' }}
      >
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        >
          <span className="script mb-2 block text-[1.1rem] tracking-[0.5px] text-rose-mid">
            saved with love
          </span>
          <h1 className="relative inline-block font-display text-[1.85rem] font-bold text-berry">
            Your Liked Crowns
            <span
              aria-hidden="true"
              className="mx-auto mt-3 block h-[3px] w-[60px] rounded-[3px]"
              style={{
                background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
              }}
            />
          </h1>
          <p className="mt-2 text-[0.95rem] text-rose-deep">
            {products.length === 1
              ? '1 crown waiting for you.'
              : `${products.length} crowns waiting for you.`}
          </p>
        </motion.div>
      </motion.section>

      {products.length === 0 ? (
        /* ===== Section 3 — empty state ===== */
        <section className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <motion.img
            src="/empty-bag.svg"
            alt=""
            width={200}
            height={200}
            className="h-48 w-48"
            animate={reduced ? { opacity: 1 } : { y: [-6, 6, -6], opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={
              reduced
                ? { duration: 0.4 }
                : { y: { duration: 3, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.4 } }
            }
          />
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="font-display text-2xl font-bold text-berry"
          >
            No crowns saved yet.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-[300px] text-sm text-rose-deep"
          >
            Tap the heart on any wig to save it here.
          </motion.p>
          <motion.button
            type="button"
            onClick={goShop}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="btn-primary mt-2"
          >
            <Icon name="storefront" size={1.05} />
            Shop the Collection
          </motion.button>
        </section>
      ) : (
        <>
          {/* ===== Section 2 — liked grid ===== */}
          <section className="px-4 pt-8">
            <motion.div layout className="grid grid-cols-1 gap-5">
              <AnimatePresence mode="popLayout">
                {products.map((p, i) => (
                  <LikedCard key={p.id} product={p} index={i} likedAt={likedAt[p.id]} />
                ))}
              </AnimatePresence>
            </motion.div>
          </section>

          {/* ===== Section 4 — concierge nudge ===== */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="px-4 py-8"
          >
            <div className="flex items-center gap-4 rounded-[20px] border border-rose-petal/40 bg-white p-5 shadow-card">
              <StylistAvatar />
              <div className="min-w-0 flex-1">
                <p className="text-[0.88rem] leading-relaxed text-charcoal">
                  Can&apos;t decide? I can compare your liked crowns and pick your perfect match.
                </p>
                <button
                  type="button"
                  onClick={openConcierge}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-berry to-berry-deep px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-white shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  <Icon name="chat_bubble" size={0.9} />
                  Ask a Stylist
                </button>
              </div>
            </div>
          </motion.section>
        </>
      )}
    </motion.div>
  );
}
