import { motion, useReducedMotion } from 'framer-motion';
import { openConcierge } from '@/components/Concierge';
import Icon from '@/components/Icon';
import StaffAvatar from './StaffAvatar';
import { whatsappOrderLink } from './track-utils';

/**
 * Help & concierge card (tracker.md §6 / thankyou.md §5): staff avatar,
 * routing note, "Chat with …" CTA (opens the concierge; login gate lives
 * in the concierge itself) and a prefilled WhatsApp fallback.
 */
export default function ConciergeCard({
  orderId,
  persona,
  role,
  avatarSrc,
  heading,
  note,
}: {
  orderId: string;
  /** e.g. "Dr. Swift" */
  persona: string;
  /** e.g. "Inventory & Logistics" */
  role: string;
  avatarSrc: string;
  heading: string;
  note: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-[20px] border border-blush bg-white p-4 shadow-[0_10px_40px_rgba(33,27,22,0.15)]"
    >
      <div className="flex items-center gap-3">
        <StaffAvatar src={avatarSrc} name={persona} size={48} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-charcoal">{heading}</h2>
          <p className="text-[0.72rem] text-rose-deep">
            {persona} · {role}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[0.78rem] leading-relaxed text-charcoal/75">{note}</p>

      <div className="mt-3 space-y-2">
        <motion.button
          type="button"
          whileTap={reduced ? undefined : { scale: 0.97 }}
          onClick={openConcierge}
          className="btn-primary min-h-[48px] w-full"
        >
          <Icon name="chat_bubble" size={1.05} />
          Chat with {persona}
        </motion.button>
        <motion.a
          href={whatsappOrderLink(orderId)}
          target="_blank"
          rel="noopener noreferrer"
          whileTap={reduced ? undefined : { scale: 0.97 }}
          className="btn-secondary min-h-[48px] w-full"
        >
          <Icon name="chat" size={1.05} />
          WhatsApp Us
        </motion.a>
      </div>
    </motion.section>
  );
}
