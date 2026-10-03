import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import CrownLogo from './CrownLogo';
import Icon from './Icon';

const DRAWER_SPRING = {
  type: 'spring',
  stiffness: 320,
  damping: 32,
} as const;

interface AnchorLink {
  kind: 'anchor';
  id: string;
  label: string;
}
interface RouteLink {
  kind: 'route';
  to: string;
  label: string;
}
type NavLinkItem = AnchorLink | RouteLink;

const NAV_LINKS: NavLinkItem[] = [
  { kind: 'anchor', id: 'shop', label: 'Shop Wigs' },
  { kind: 'anchor', id: 'delivery', label: 'Delivery' },
  { kind: 'anchor', id: 'policies', label: 'Policies' },
  { kind: 'anchor', id: 'contact', label: 'Contact' },
  { kind: 'route', to: '/track', label: 'Track Order' },
  { kind: 'route', to: '/account', label: 'Account' },
];

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Navigate to a home-page section from anywhere in the app. */
export function useGoToSection() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (id: string) => {
      if (location.pathname !== '/') {
        sessionStorage.setItem('nc_scroll', id);
        navigate('/');
      } else {
        scrollToSection(id);
      }
    },
    [location.pathname, navigate],
  );
}

/**
 * Sticky glass header (design.md §7.1): crown logo, cart bag with
 * pulsing count badge (opens CartDrawer), hamburger → right slide-in
 * nav drawer (78% / max 320px, porcelain→blush gradient).
 */
export default function Header() {
  const { cartCount, setCartOpen } = useApp();
  const [navOpen, setNavOpen] = useState(false);
  const goToSection = useGoToSection();

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [navOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleNav = (item: NavLinkItem) => {
    setNavOpen(false);
    if (item.kind === 'anchor') goToSection(item.id);
  };

  return (
    <>
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-[100] border-b border-rose-petal/30 bg-porcelain/85 shadow-[0_4px_30px_rgba(211,190,145,0.2)] backdrop-blur-[18px]"
    >
      <div className="mx-auto flex items-center justify-between gap-2 px-4 py-3">
        <Link to="/" aria-label="NaumiCrowns home" className="shrink-0">
          <CrownLogo />
        </Link>

        <div className="flex items-center gap-3">
          {/* Cart bag with pulsing count badge */}
          <button
            type="button"
            aria-label={`Open cart, ${cartCount} items`}
            onClick={() => setCartOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center text-berry transition-transform hover:scale-110"
          >
            <Icon name="shopping_bag" size={1.6} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 1.4 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-berry to-berry-deep text-[0.7rem] font-semibold text-white shadow-[0_2px_8px_rgba(33,27,22,0.4)]"
                  style={{ animation: 'ncPulse 2s infinite' }}
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Hamburger */}
          <button
            type="button"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((o) => !o)}
            className="relative z-[160] flex h-10 w-10 flex-col items-center justify-center gap-[5px]"
          >
            <span
              className="block h-[3px] w-7 rounded-full bg-berry transition-all duration-300"
              style={
                navOpen ? { transform: 'translateY(8px) rotate(45deg)' } : undefined
              }
            />
            <span
              className="block h-[3px] w-7 rounded-full bg-berry transition-all duration-300"
              style={navOpen ? { opacity: 0, transform: 'scaleX(0)' } : undefined}
            />
            <span
              className="block h-[3px] w-7 rounded-full bg-berry transition-all duration-300"
              style={
                navOpen ? { transform: 'translateY(-8px) rotate(-45deg)' } : undefined
              }
            />
          </button>
        </div>
      </div>
    </motion.header>

      {/* Scrim — sibling of the header: the header's backdrop-blur creates a
          containing block for fixed descendants, which clipped the drawer. */}
      <AnimatePresence>
        {navOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-[140] bg-charcoal/50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Right slide-in nav drawer */}
      <AnimatePresence>
        {navOpen && (
          <motion.nav
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={DRAWER_SPRING}
            className="fixed bottom-0 right-0 top-0 z-[150] w-[78%] max-w-[320px] overflow-y-auto border-l border-rose-petal/40 bg-gradient-to-b from-porcelain to-blush px-6 pb-8 pt-24 shadow-[-10px_0_40px_rgba(33,27,22,0.15)]"
            aria-label="Primary navigation"
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-berry text-white shadow-[0_4px_14px_rgba(33,27,22,0.35)] transition-transform hover:scale-105"
            >
              <Icon name="close" size={1.3} />
            </button>
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                >
                  {item.kind === 'route' ? (
                    <Link
                      to={item.to}
                      onClick={() => setNavOpen(false)}
                      className="flex items-center justify-between rounded-xl px-5 py-4 font-medium text-charcoal transition-all hover:translate-x-1 hover:bg-gradient-to-br hover:from-blush hover:to-rose-petal hover:text-berry"
                    >
                      {item.label}
                      <Icon name="arrow_forward" size={1} className="text-rose-mid" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleNav(item)}
                      className="flex w-full items-center justify-between rounded-xl px-5 py-4 text-left font-medium text-charcoal transition-all hover:translate-x-1 hover:bg-gradient-to-br hover:from-blush hover:to-rose-petal hover:text-berry"
                    >
                      {item.label}
                      <Icon name="arrow_forward" size={1} className="text-rose-mid" />
                    </button>
                  )}
                </motion.li>
              ))}
            </ul>
            <p className="script mt-8 px-5 text-rose-deep">Every crown tells a story.</p>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
