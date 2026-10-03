import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Petals from '@/components/Petals';
import Hero from '@/sections/home/Hero';
import Marquee from '@/sections/home/Marquee';
import Shop from '@/sections/home/Shop';
import Delivery from '@/sections/home/Delivery';
import Policies from '@/sections/home/Policies';
import Faq from '@/sections/home/Faq';

/** Gold/pink cursor sparkles on desktop pointers (home only, throttled 80ms). */
function useCursorSparkles() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    let last = 0;
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - last < 80) return;
      last = now;
      const s = document.createElement('div');
      s.className = 'nc-sparkle';
      s.style.left = `${e.clientX - 7}px`;
      s.style.top = `${e.clientY - 7}px`;
      s.style.background = `radial-gradient(circle, ${Math.random() > 0.5 ? '#D4AF37' : '#E3D5BC'} 0%, transparent 70%)`;
      document.body.appendChild(s);
      window.setTimeout(() => s.remove(), 800);
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);
}

/**
 * Home — faithful port of the approved one-pager (home.md):
 * petals + hero + marquee + shop grid + delivery + policies + FAQ + ads.
 * Header, footer, bottom nav, cart drawer and concierge come from Layout.
 */
export default function Home() {
  useCursorSparkles();

  // Honor pending section scrolls (e.g. "Shop Wigs" tapped from another route).
  useEffect(() => {
    const target = sessionStorage.getItem('nc_scroll');
    if (target) {
      sessionStorage.removeItem('nc_scroll');
      const t = window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => window.clearTimeout(t);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Petals />
      <Hero />
      <Marquee />
      <Shop />
      <Delivery />
      <Policies />
      <Faq />
    </motion.div>
  );
}
