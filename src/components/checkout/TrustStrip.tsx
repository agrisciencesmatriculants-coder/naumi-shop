import { motion, useReducedMotion } from 'framer-motion';
import Icon from '@/components/Icon';
import { openConcierge } from '@/components/Concierge';
import { cn } from '@/lib/utils';

/**
 * Trust micro-badges + concierge help link (checkout.md §6 /
 * payment.md §5). Staggered fade-up on entering the viewport.
 */
export default function TrustStrip({
  badges,
  helpLabel = 'Need help? Chat with Dr. Tech',
  note,
}: {
  badges: { icon: string; label: string; tone: 'success' | 'berry' | 'gold' }[];
  helpLabel?: string;
  note?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="pt-2">
      <div className="flex items-stretch justify-center gap-2">
        {badges.map((b, i) => (
          <motion.div
            key={b.label}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: reduced ? 0 : i * 0.1 }}
            className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl border border-blush bg-white px-2 py-3 text-center shadow-soft"
          >
            <Icon
              name={b.icon}
              size={1.15}
              className={cn(
                b.tone === 'success' && 'text-success',
                b.tone === 'berry' && 'text-berry',
                b.tone === 'gold' && 'text-gold',
              )}
            />
            <span className="text-[0.68rem] font-semibold leading-tight text-charcoal">
              {b.label}
            </span>
          </motion.div>
        ))}
      </div>
      {note && (
        <p className="mt-3 text-center text-[0.72rem] leading-relaxed text-rose-deep">{note}</p>
      )}
      <button
        type="button"
        onClick={openConcierge}
        className="mx-auto mt-3 flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[0.78rem] font-semibold text-berry transition-colors hover:bg-blush"
      >
        <Icon name="support_agent" size={1} />
        {helpLabel}
      </button>
    </div>
  );
}
