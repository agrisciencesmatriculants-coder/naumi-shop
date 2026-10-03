import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { AppProvider } from '@/store/AppContext';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Liked from '@/pages/Liked';
import Checkout from '@/pages/Checkout';
import Payment from '@/pages/Payment';
import Track from '@/pages/Track';
import ThankYou from '@/pages/ThankYou';
import Account from '@/pages/Account';
import Admin from '@/pages/Admin';
import AdminOffice from '@/pages/AdminOffice';
import Login from '@/pages/Login';

/** Scroll to top on route change (unless a section scroll is pending). */
function ScrollToTopOnRoute() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!sessionStorage.getItem('nc_scroll')) window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AppProvider>
      <ScrollToTopOnRoute />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="liked" element={<Liked />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="payment/:orderId" element={<Payment />} />
          <Route path="track" element={<Track />} />
          <Route path="track/:orderId" element={<Track />} />
          <Route path="thank-you/:orderId" element={<ThankYou />} />
          <Route path="account" element={<Account />} />
          <Route path="admin" element={<Admin />} />
          <Route path="admin/office" element={<AdminOffice />} />
          <Route path="login" element={<Login />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
