import { useLocation, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { cn } from '@/lib/utils';
import Icon from './Icon';

/**
 * Fixed bottom navigation (design.md §7.2): 5 items, active route
 * highlighted berry on blush pill. Shop scrolls to #shop on home.
 */
export default function BottomNav() {
  const { cartCount, setCartOpen } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const goShop = () => {
    if (path !== '/') {
      sessionStorage.setItem('nc_scroll', 'shop');
      navigate('/');
    } else {
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const itemClass = (active: boolean) =>
    cn(
      'relative flex min-w-[54px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[0.62rem] font-semibold transition-colors',
      active ? 'bg-blush text-berry' : 'text-charcoal hover:text-berry',
    );

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed bottom-0 left-1/2 z-[450] flex w-full max-w-[480px] -translate-x-1/2 items-stretch justify-around border-t border-blush bg-white/95 px-1 pb-[calc(6px+env(safe-area-inset-bottom,0px))] pt-1.5 shadow-[0_-6px_24px_rgba(33,27,22,0.12)] backdrop-blur-md"
    >
      <button type="button" onClick={goShop} className={itemClass(path === '/')}>
        <NavIcon name="storefront" active={path === '/'} />
        <span>Shop</span>
      </button>

      <button type="button" onClick={() => navigate('/liked')} className={itemClass(path === '/liked')}>
        <NavIcon name="favorite" active={path === '/liked'} />
        <span>Liked</span>
      </button>

      <button type="button" onClick={() => setCartOpen(true)} className={itemClass(false)}>
        <span className="relative">
          <Icon name="shopping_bag" size={1.35} />
          {cartCount > 0 && (
            <motion.span
              key={cartCount}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25 }}
              className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-berry to-berry-deep text-[0.58rem] font-bold text-white"
            >
              {cartCount}
            </motion.span>
          )}
        </span>
        <span>Cart</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/track')}
        className={itemClass(path.startsWith('/track'))}
      >
        <NavIcon name="local_shipping" active={path.startsWith('/track')} />
        <span>Track</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/account')}
        className={itemClass(path.startsWith('/account'))}
      >
        <NavIcon name="person" active={path.startsWith('/account')} />
        <span>Account</span>
      </button>
    </nav>
  );
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  return (
    <motion.span
      key={`${name}-${active}`}
      initial={active ? { scale: 1.2 } : false}
      animate={{ scale: 1 }}
      transition={{ duration: 0.25 }}
      className="flex"
    >
      <Icon name={name} size={1.35} />
    </motion.span>
  );
}
