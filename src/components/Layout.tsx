import { Outlet, useLocation } from 'react-router';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import CartDrawer from './CartDrawer';
import ToastHost from './Toast';
import ScrollTop from './ScrollTop';
import Concierge from './Concierge';

/**
 * App shell (design.md §5): 480px centered column, porcelain bg,
 * desktop backdrop gradient. Header + page + Footer + BottomNav +
 * CartDrawer + ScrollTop + Toast host + Concierge FAB.
 * Uses the nested-routes `<Outlet/>` pattern.
 *
 * Admin pages render their own fixed tab bar — the public BottomNav and
 * Concierge FAB are suppressed there so they never overlap/intercept it.
 */
export default function Layout() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="app-shell">
      <Header />
      <main className="relative z-[2]">
        <Outlet />
      </main>
      <Footer />
      {!isAdmin && <BottomNav />}
      <CartDrawer />
      <ScrollTop />
      <ToastHost />
      {!isAdmin && <Concierge />}
    </div>
  );
}
