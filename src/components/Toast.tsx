import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { cn } from '@/lib/utils';
import Icon from './Icon';

/**
 * Global toast host (design.md §7.6): top-center pill, berry gradient,
 * drop-in 0.4s, auto-dismiss 2.2s. Errors: berry-deep + gold border.
 */
export default function ToastHost() {
  const { toasts } = useApp();

  return (
    <div className="pointer-events-none fixed left-1/2 top-[76px] z-[999] flex w-full max-w-[440px] -translate-x-1/2 flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={cn(
              'flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white shadow-[0_10px_30px_rgba(33,27,22,0.4)]',
              t.type === 'error'
                ? 'border border-gold bg-berry-deep'
                : 'bg-gradient-to-br from-berry to-berry-deep',
            )}
          >
            <Icon
              name={t.type === 'error' ? 'error' : t.type === 'info' ? 'info' : 'check_circle'}
              size={1}
            />
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
