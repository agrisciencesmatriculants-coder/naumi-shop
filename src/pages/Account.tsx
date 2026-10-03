import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import {
  formatDateTime,
  isAdminEmail,
  listOrdersForUser,
  signOut,
  useCurrentUser,
  useOrders,
} from '@/lib/backend';
import type { Order, OrderStatus, User } from '@/lib/backend';
import { formatPrice } from '@/lib/catalog';
import { SITE } from '@/lib/site';
import Icon from '@/components/Icon';
import StatusChip from '@/components/StatusChip';
import type { OrderStatus as ChipStatus } from '@/components/StatusChip';
import { CrownGlyph } from '@/components/CrownLogo';
import { openConcierge } from '@/components/Concierge';
import { cn } from '@/lib/utils';

/** Map backend order statuses onto the shared StatusChip vocabulary. */
const CHIP_STATUS: Record<OrderStatus, ChipStatus> = {
  order_received: 'received',
  payment_confirmed: 'payment_confirmed',
  workshop_check: 'workshop_check',
  crafting: 'crafting',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

/** SA numbers: 0XXXXXXXXX, 27XXXXXXXXX or +27XXXXXXXXX. */
const PHONE_RE = /^(\+27|27|0)\d{9}$/;

const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
};

/* ============================================================
   Section 1 — signed-out state
   ============================================================ */

function SignedOut() {
  const reduced = useReducedMotion();

  return (
    <motion.div {...pageTransition}>
      <section
        className="flex flex-col items-center gap-4 px-6 py-12 text-center"
        style={{ background: 'linear-gradient(135deg, #F4EEDF 0%, #E3D5BC 100%)' }}
      >
        <motion.span
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -30, scale: 0.8 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_8px_25px_rgba(33,27,22,0.35)]"
          style={{
            background: 'linear-gradient(135deg, #E3D5BC, #211B16)',
            animation: reduced ? undefined : 'crownFloat 3s ease-in-out infinite',
          }}
        >
          <CrownGlyph size={30} />
        </motion.span>
        <h1 className="font-display text-3xl font-bold text-berry">Your Crown Account</h1>
        <p className="max-w-[320px] text-sm leading-relaxed text-charcoal/85">
          Sign in to track orders, sync your liked crowns, and chat with our stylists.
        </p>
        <motion.div
          animate={reduced ? undefined : { scale: [1, 1.03, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Link to="/login" className="btn-primary">
            <Icon name="login" size={1.05} />
            Sign in to your account
          </Link>
        </motion.div>
        <p className="max-w-[300px] text-[0.72rem] leading-relaxed text-rose-deep">
          Guests can browse, like and fill their bag — sign-in is only needed at checkout and chat.
        </p>
      </section>
    </motion.div>
  );
}

/* ============================================================
   Section 2 — profile card (phone edits persist locally;
   the backend user record has no update API)
   ============================================================ */

const phoneKey = (userId: string) => `nc_phone_${userId}`;

function readPhone(user: User): string {
  try {
    return localStorage.getItem(phoneKey(user.id)) ?? user.phone ?? '';
  } catch {
    return user.phone ?? '';
  }
}

function ProfileCard({ user }: { user: User }) {
  const { showToast } = useApp();
  const reduced = useReducedMotion();
  const [phone, setPhone] = useState(() => readPhone(user));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(phone);
  const [saved, setSaved] = useState(false);

  const save = () => {
    const clean = draft.replace(/[\s()-]/g, '');
    if (clean && !PHONE_RE.test(clean)) {
      showToast('Enter a valid SA number (10 digits, e.g. 082 123 4567).', 'error');
      return;
    }
    try {
      localStorage.setItem(phoneKey(user.id), draft.trim());
    } catch {
      /* storage unavailable */
    }
    setPhone(draft.trim());
    setEditing(false);
    setSaved(true);
    showToast('Phone number saved');
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="px-4 pt-6"
    >
      <div className="rounded-[20px] border border-rose-petal/40 bg-white p-5 shadow-card">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-xl font-bold text-white ring-2 ring-gold ring-offset-2 ring-offset-white"
            style={{ background: 'linear-gradient(135deg, #211B16, #151110)' }}
          >
            {user.name.trim().charAt(0).toUpperCase() || 'Q'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold text-berry">{user.name}</h2>
              {isAdminEmail(user.email) && (
                <span className="relative inline-flex overflow-hidden rounded-full border border-gold/50 bg-gold-soft px-3 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[1px] text-[#8a6d00]">
                  Co-Owner · Admin
                  {!reduced && (
                    <motion.span
                      aria-hidden="true"
                      initial={{ x: '-120%' }}
                      animate={{ x: '220%' }}
                      transition={{ duration: 0.9, delay: 0.6, ease: 'easeInOut' }}
                      className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                    />
                  )}
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.82rem] text-charcoal/75">
              <Icon name="mail" size={0.9} className="shrink-0 text-rose-mid" />
              {user.email}
            </p>
          </div>
        </div>

        {/* phone — inline editable with save check */}
        <div className="mt-4 border-t border-blush pt-4">
          <span className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[1.5px] text-rose-mid">
            Phone
          </span>
          {editing ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Icon
                  name="call"
                  size={0.95}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rose-mid"
                />
                <input
                  type="tel"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="082 123 4567"
                  autoComplete="tel"
                  aria-label="Phone number"
                  className="w-full rounded-xl border border-rose-petal/60 bg-porcelain py-2.5 pl-9 pr-3 text-sm text-charcoal outline-none transition-colors placeholder:text-charcoal/35 focus:border-berry"
                />
              </div>
              <button
                type="button"
                aria-label="Save phone number"
                onClick={save}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-berry to-berry-deep text-white shadow-soft transition-transform hover:scale-105"
              >
                <Icon name="check" size={1.05} />
              </button>
              <button
                type="button"
                aria-label="Cancel editing"
                onClick={() => {
                  setDraft(phone);
                  setEditing(false);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush text-berry transition-colors hover:bg-rose-petal hover:text-white"
              >
                <Icon name="close" size={1.05} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(phone);
                setEditing(true);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left text-sm text-charcoal transition-colors hover:text-berry"
            >
              <Icon name="call" size={0.95} className="text-rose-mid" />
              <span className={cn('flex-1', !phone && 'text-charcoal/45')}>
                {phone || 'Add your phone number'}
              </span>
              {saved ? (
                <Icon name="check_circle" size={1} className="text-success" />
              ) : (
                <Icon name="edit" size={0.95} className="text-rose-mid" />
              )}
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}

/* ============================================================
   Section 3 — my orders
   ============================================================ */

function OrderRow({ order, index }: { order: Order; index: number }) {
  const reduced = useReducedMotion();
  const itemCount = order.items.reduce((n, i) => n + i.qty, 0);

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 + index * 0.06 }}
    >
      <Link
        to={`/track/${order.id}`}
        className="flex items-center gap-3 rounded-[14px] border border-rose-petal/40 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-[0.95rem] font-bold text-charcoal">{order.id}</span>
            <span className="font-display text-[0.95rem] font-bold text-berry">
              {formatPrice(order.total)}
            </span>
          </div>
          <p className="mt-0.5 text-[0.72rem] text-rose-deep">
            {formatDateTime(order.createdAt)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
          <div className="mt-2">
            <StatusChip status={CHIP_STATUS[order.status]} />
          </div>
        </div>
        <Icon name="chevron_right" size={1.2} className="shrink-0 text-rose-mid" />
      </Link>
    </motion.div>
  );
}

function MyOrders({ user }: { user: User }) {
  const navigate = useNavigate();
  // Live subscription — re-renders this section whenever orders change.
  useOrders();
  const orders = listOrdersForUser(user.id);

  return (
    <section className="px-4 pt-8">
      <h2 className="font-display text-[1.2rem] font-bold text-berry">My Orders</h2>
      {orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-3 flex flex-col items-center gap-3 rounded-[20px] border border-rose-petal/40 bg-white px-5 py-8 text-center shadow-card"
        >
          <Icon name="receipt_long" size={1.8} className="text-rose-petal" />
          <p className="text-sm text-rose-deep">No orders yet — your first crown awaits.</p>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('nc_scroll', 'shop');
              navigate('/');
            }}
            className="inline-flex items-center gap-2 rounded-full border-2 border-berry px-6 py-2.5 text-[0.75rem] font-semibold uppercase tracking-[1.5px] text-berry transition-colors hover:bg-berry hover:text-white"
          >
            <Icon name="storefront" size={0.95} />
            Shop Now
          </button>
        </motion.div>
      ) : (
        <div className="mt-3 space-y-3">
          {orders.map((o, i) => (
            <OrderRow key={o.id} order={o} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================================================
   Section 4 — quick links
   ============================================================ */

function QuickLinks({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const links: {
    key: string;
    icon: string;
    label: string;
    onClick: () => void;
    external?: boolean;
    admin?: boolean;
  }[] = [
    { key: 'liked', icon: 'favorite', label: 'Liked Crowns', onClick: () => navigate('/liked') },
    { key: 'track', icon: 'local_shipping', label: 'Track an Order', onClick: () => navigate('/track') },
    { key: 'chat', icon: 'chat_bubble', label: 'Chat with a Stylist', onClick: () => openConcierge() },
    {
      key: 'policies',
      icon: 'policy',
      label: 'Store Policies',
      onClick: () => {
        sessionStorage.setItem('nc_scroll', 'policies');
        navigate('/');
      },
    },
    {
      key: 'whatsapp',
      icon: 'chat',
      label: 'WhatsApp Us',
      external: true,
      onClick: () => window.open(SITE.whatsapp, '_blank', 'noopener,noreferrer'),
    },
  ];

  if (isAdmin) {
    links.push({
      key: 'office',
      icon: 'groups',
      label: 'The Crown Office',
      admin: true,
      onClick: () => navigate('/admin'),
    });
  }

  return (
    <section className="px-4 pt-8">
      <h2 className="font-display text-[1.2rem] font-bold text-berry">Quick Links</h2>
      <div className="mt-3 space-y-2">
        {links.map((link, i) => (
          <motion.button
            key={link.key}
            type="button"
            onClick={link.onClick}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.15 + i * 0.05 }}
            whileHover={reduced ? undefined : { x: 4 }}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3.5 text-left shadow-soft transition-colors hover:bg-blush',
              link.admin ? 'border-gold/60' : 'border-rose-petal/40',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                link.admin
                  ? 'bg-gold-soft text-[#8a6d00]'
                  : 'bg-blush text-berry',
              )}
            >
              <Icon name={link.icon} size={1.1} />
            </span>
            <span className="flex-1 text-[0.85rem] font-semibold text-charcoal">{link.label}</span>
            <Icon
              name={link.external ? 'open_in_new' : 'chevron_right'}
              size={1.1}
              className="text-rose-mid"
            />
          </motion.button>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   Section 5 — sign out (two-step confirm)
   ============================================================ */

function SignOutButton() {
  const { showToast } = useApp();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return undefined;
    const t = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(t);
  }, [confirming]);

  const handle = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    signOut();
    showToast('Sharp sharp — see you soon.');
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="flex justify-center px-4 pb-10 pt-8"
    >
      <button
        type="button"
        onClick={handle}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border-2 px-8 py-3 text-[0.8rem] font-semibold uppercase tracking-[1.5px] transition-colors',
          confirming
            ? 'border-berry bg-berry text-white'
            : 'border-plum/60 bg-transparent text-plum hover:border-plum hover:bg-plum hover:text-white',
        )}
      >
        <Icon name={confirming ? 'warning' : 'logout'} size={1} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={confirming ? 'confirm' : 'idle'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {confirming ? 'Tap again to confirm' : 'Sign Out'}
          </motion.span>
        </AnimatePresence>
      </button>
    </motion.section>
  );
}

/* ============================================================
   Account page (design/account.md)
   ============================================================ */

export default function Account() {
  const user = useCurrentUser();

  if (!user) return <SignedOut />;

  return (
    <motion.div {...pageTransition}>
      <ProfileCard user={user} />
      <MyOrders user={user} />
      <QuickLinks isAdmin={isAdminEmail(user.email)} />
      <SignOutButton />
    </motion.div>
  );
}
