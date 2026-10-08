import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';

/**
 * Scroll-to-top: 44px gradient circle, appears after 400px scroll,
 * sits above the bottom nav (bottom 152px). Positioned relative to
 * the 480px app column.
 */
export default function ScrollTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          aria-label="Scroll to top"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed z-[440] flex h-10 w-10 items-center justify-center rounded-full text-white shadow-[0_6px_20px_rgba(33,27,22,0.3)]"
          style={{
            bottom: 152,
            right: 'max(12px, calc(50vw - 240px + 12px))',
            background: 'linear-gradient(135deg, #E3D5BC, #211B16)',
          }}
        >
          <Icon name="arrow_upward" size={1.1} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
