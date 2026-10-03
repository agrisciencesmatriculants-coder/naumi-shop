import { motion, useReducedMotion } from 'framer-motion';
import Icon from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * Slim focus-mode header for checkout/payment (checkout.md §1):
 * back chevron, centered Playfair title, gold lock chip, and an
 * optional 3-step progress indicator.
 */
export default function FocusHeader({
  title,
  backLabel,
  onBack,
  steps,
  activeStep = 1,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
  /** Step labels, e.g. ['Details', 'Delivery', 'Payment'] */
  steps?: string[];
  /** 1-based active step */
  activeStep?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.header
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-[60] border-b border-rose-petal/30 bg-porcelain/90 backdrop-blur-[18px]"
    >
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-berry transition-colors hover:bg-blush"
        >
          <Icon name="chevron_left" size={1.5} />
        </button>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-berry">{title}</h1>
        <span className="flex h-11 shrink-0 items-center gap-1 rounded-full border border-gold/40 bg-gold-soft/60 px-2.5 text-[0.6rem] font-semibold uppercase tracking-[1px] text-[#8a6d00]">
          <Icon name="lock" size={0.8} />
          100% Upfront
        </span>
      </div>

      {steps && (
        <div className="flex items-start px-6 pb-3" aria-label={`Step ${activeStep} of ${steps.length}`}>
          {steps.map((label, i) => {
            const n = i + 1;
            const done = n < activeStep;
            const active = n === activeStep;
            return (
              <div key={label} className={cn('flex items-start', i < steps.length - 1 && 'flex-1')}>
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      'relative flex h-7 w-7 items-center justify-center rounded-full text-[0.7rem] font-bold transition-colors',
                      done && 'bg-success text-white',
                      active && 'bg-gradient-to-br from-berry to-berry-deep text-white shadow-[0_4px_12px_rgba(33,27,22,0.4)]',
                      !done && !active && 'border border-rose-petal/60 bg-white text-rose-deep',
                    )}
                  >
                    {active && !reduced && (
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-berry"
                        animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                      />
                    )}
                    {done ? <Icon name="check" size={0.95} /> : n}
                  </span>
                  <span
                    className={cn(
                      'text-[0.6rem] font-semibold uppercase tracking-[1px]',
                      active ? 'text-berry' : done ? 'text-success' : 'text-rose-deep/70',
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="mx-2 mt-[13px] h-0.5 flex-1 overflow-hidden rounded-full bg-blush">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-rose-petal to-berry"
                      initial={false}
                      animate={{ scaleX: done ? 1 : 0 }}
                      style={{ originX: 0 }}
                      transition={{ duration: reduced ? 0 : 0.4, ease: 'easeOut' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.header>
  );
}
