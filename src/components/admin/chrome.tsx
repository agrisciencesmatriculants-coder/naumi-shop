import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { User } from '@/lib/backend';
import { isAdminEmail, signOut } from '@/lib/backend';
import { sastNow } from '@/lib/office';
import type { StaffMember } from '@/lib/office';
import Icon from '@/components/Icon';
import { CrownGlyph } from '@/components/CrownLogo';
import { cn } from '@/lib/utils';

/* ============================================================
   Access gate (admin.md / office.md): signed-in George or Naumi only.
   ============================================================ */

export function AdminGate({
  user,
  children,
}: {
  user: User | null;
  children: (admin: User) => ReactNode;
}) {
  if (!user) {
    return (
      <AccessCard
        icon="lock"
        title="The Crown Office"
        message="This office is for George & Naumi only. Sign in with an admin account to enter."
        cta={{ to: '/login', label: 'Sign In' }}
      />
    );
  }
  if (!isAdminEmail(user.email)) {
    return (
      <AccessCard
        icon="workspace_premium"
        title="Admins Only"
        message="This office is for George & Naumi only. Your crown awaits back in the shop."
        cta={{ to: '/', label: 'Back to Shop' }}
      />
    );
  }
  return <>{children(user)}</>;
}

function AccessCard({
  icon,
  title,
  message,
  cta,
}: {
  icon: string;
  title: string;
  message: string;
  cta: { to: string; label: string };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-float"
        style={{ background: 'linear-gradient(135deg, #17120E, #3B332B)' }}
      >
        <Icon name={icon} size={1.8} />
      </div>
      <h1 className="font-display text-3xl font-bold text-berry">{title}</h1>
      <p className="max-w-[300px] text-sm text-rose-deep">{message}</p>
      <Link
        to={cta.to}
        className="mt-2 rounded-full bg-gradient-to-br from-berry to-berry-deep px-6 py-3 text-xs font-semibold uppercase tracking-[1.5px] text-white shadow-[0_8px_25px_rgba(33,27,22,0.35)] transition-transform hover:-translate-y-0.5"
      >
        {cta.label}
      </Link>
      <Link to="/" className="text-xs font-medium text-rose-deep underline underline-offset-4">
        Back to shop
      </Link>
    </motion.div>
  );
}

/* ============================================================
   Time helpers (SAST, offset math — mirrors lib/office.ts)
   ============================================================ */

/** Tick the current time every `ms` milliseconds. */
export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

/** "14:32:05" in SAST wall-clock time. */
export function sastClock(withSeconds = true): string {
  const d = sastNow();
  const pad = (n: number) => String(n).padStart(2, '0');
  const base = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getUTCSeconds())}` : base;
}

/** "Mon 8 Feb" style SAST date label. */
export function sastDateLabel(): string {
  const d = sastNow();
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d);
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ============================================================
   Admin header (admin.md §1): plum gradient bar, who-am-I chip,
   notification bell, live SAST clock, sign-out.
   ============================================================ */

export function AdminHeader({
  user,
  title,
  subtitle,
  alertCount,
  onBell,
}: {
  user: User;
  title: string;
  subtitle: string;
  alertCount: number;
  onBell?: () => void;
}) {
  const navigate = useNavigate();
  useNow(1000); // tick the SAST clock
  const firstName = user.name.split(/\s+/)[0] ?? 'Admin';

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="text-white shadow-[0_10px_30px_rgba(23,18,14,0.35)]"
      style={{ background: 'linear-gradient(135deg, #17120E, #3B332B)' }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-[0_4px_15px_rgba(33,27,22,0.45)]"
            style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
          >
            <CrownGlyph size={18} />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-bold leading-tight">
              {title}
            </span>
            <span className="block truncate text-[0.66rem] text-rose-petal/90">{subtitle}</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Live SAST clock */}
          <span className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[0.62rem] font-semibold tracking-[1px] min-[380px]:flex">
            <Icon name="schedule" size={0.8} className="text-gold" />
            <span className="tabular-nums">{sastClock()}</span> SAST
          </span>

          {/* Who-am-I chip */}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-berry to-berry-deep text-[0.72rem] font-bold ring-2 ring-gold" aria-label={`Signed in as ${user.name}`}>
            {firstName[0]?.toUpperCase()}
          </span>

          {/* Notification bell */}
          <button
            type="button"
            onClick={onBell}
            aria-label={`${alertCount} things need attention`}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10"
          >
            <Icon name="notifications" size={1.25} />
            <AnimatePresence>
              {alertCount > 0 && (
                <motion.span
                  key={alertCount}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[0.56rem] font-bold text-plum"
                >
                  {alertCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Sign out */}
          <button
            type="button"
            aria-label="Sign out"
            onClick={() => {
              signOut();
              navigate('/');
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-rose-petal transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="logout" size={1.15} />
          </button>
        </div>
      </div>
    </motion.header>
  );
}

/* ============================================================
   Admin tab bar (admin.md): fixed plum glass bar that covers the
   public BottomNav on admin routes. 5 items, gold active state.
   ============================================================ */

export type AdminTab = 'dashboard' | 'orders' | 'payments' | 'stock' | 'office';

const TAB_ITEMS: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'orders', label: 'Orders', icon: 'receipt_long' },
  { id: 'payments', label: 'Payments', icon: 'payments' },
  { id: 'stock', label: 'Stock', icon: 'inventory_2' },
  { id: 'office', label: 'Office', icon: 'groups' },
];

export function AdminTabBar({
  active,
  badges,
}: {
  active: AdminTab;
  badges?: Partial<Record<AdminTab, number>>;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (tab: AdminTab) => {
    if (tab === 'office') {
      navigate('/admin/office');
      return;
    }
    if (location.pathname === '/admin') {
      // Same page — switch tab via search param.
      navigate(tab === 'dashboard' ? '/admin' : `/admin?tab=${tab}`);
    } else {
      navigate(tab === 'dashboard' ? '/admin' : `/admin?tab=${tab}`);
    }
  };

  return (
    <nav
      aria-label="Admin sections"
      className="fixed bottom-0 left-1/2 z-[460] flex w-full max-w-[480px] -translate-x-1/2 items-stretch justify-around border-t border-white/10 px-1 pb-[calc(8px+env(safe-area-inset-bottom,0px))] pt-2 backdrop-blur-md"
      style={{ background: 'rgba(23,18,14,0.95)' }}
    >
      {TAB_ITEMS.map((item) => {
        const isActive = active === item.id;
        const badge = badges?.[item.id] ?? 0;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => go(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex min-w-[54px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[0.62rem] font-semibold transition-colors',
              isActive ? 'text-gold' : 'text-rose-petal/70 hover:text-rose-petal',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="admin-tab-bar"
                className="absolute -top-2 left-2 right-2 h-0.5 rounded-full bg-gold"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">
              <Icon name={item.icon} size={1.35} />
              {badge > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-berry to-berry-deep px-1 text-[0.56rem] font-bold text-white">
                  {badge}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ============================================================
   Count-up number (design.md §6 counters)
   ============================================================ */

export function CountUp({
  value,
  format,
  duration = 0.8,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const from = prev.current;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  return <span className={cn('tabular-nums', className)}>{format ? format(display) : display}</span>;
}

/* ============================================================
   Staff avatar — colored initials circle (office.ts: no image files)
   ============================================================ */

export function StaffAvatar({
  staff,
  size = 80,
  ring,
  online,
  className,
}: {
  staff: StaffMember;
  /** px size of the circle */
  size?: number;
  /** ring color hex; falls back to staff color */
  ring?: string;
  /** presence dot: true = online green, false = grey, undefined = none */
  online?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      <span
        className="flex h-full w-full items-center justify-center rounded-full font-display font-bold text-white"
        style={{
          background: `linear-gradient(135deg, ${staff.color}, #17120E)`,
          fontSize: size * 0.34,
          boxShadow: `0 0 0 3px ${ring ?? staff.color}, 0 6px 18px rgba(23,18,14,0.25)`,
        }}
      >
        {staff.initials}
      </span>
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white',
            online ? 'bg-online' : 'bg-charcoal/30',
          )}
          style={online ? { animation: 'ncPulse 2s infinite' } : undefined}
          aria-label={online ? 'On duty' : 'Off duty'}
        />
      )}
    </span>
  );
}

/* ============================================================
   Internal admin notes — local-only, never emailed (admin.md §3).
   ============================================================ */

const notesKey = (orderId: string) => `nc_admin_note_${orderId}`;

export function getAdminNote(orderId: string): string {
  try {
    return localStorage.getItem(notesKey(orderId)) ?? '';
  } catch {
    return '';
  }
}

export function setAdminNote(orderId: string, note: string): void {
  try {
    const clean = note.trim();
    if (clean) localStorage.setItem(notesKey(orderId), clean);
    else localStorage.removeItem(notesKey(orderId));
  } catch {
    /* storage unavailable */
  }
}
