import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Questions & answers verbatim from the approved page. */
const FAQS = [
  {
    q: 'How long does delivery take?',
    a: 'We make our own wigs in-house, so shipping is fast. Delivery takes 2 to 6 business working days via Paxi (PEP stores) or PostNet. If it takes more than 6 days, you get R50 off your next purchase.',
  },
  {
    q: 'What types of wigs do you sell?',
    a: 'We sell three ranges: Bob wigs in 8 to 14 inches (R350 to R650), Bouncy Human Blends in 26 to 30 inches (R680 to R750), and Human Hair Blends in 28 to 30 inches (R680 to R700). Every crown is carefully inspected before dispatch.',
  },
  {
    q: 'What is your returns policy?',
    a: 'Due to hygiene, we do not offer cash refunds. We allow exchanges within 5 days of receiving your order on certain products, as long as the lace has not been cut, trimmed, or altered and the wig is unworn.',
  },
  {
    q: 'How much do your wigs cost?',
    a: 'Our wigs range from R350 for an 8-inch Bob to R750 for a 30-inch Bouncy Human Blend.',
  },
  {
    q: 'Where do you deliver?',
    a: 'We deliver nationwide across South Africa via Paxi (to any PEP store) and PostNet. Processing takes 1-2 days, then 2-6 business days for delivery.',
  },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.08 }}
      className={cn(
        'overflow-hidden rounded-[14px] border bg-white transition-all duration-300',
        open ? 'border-rose-mid shadow-soft' : 'border-blush',
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[0.9rem] font-semibold text-charcoal"
      >
        {q}
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          className="shrink-0 text-xl font-normal text-berry"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-[0.84rem] text-charcoal/85">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** FAQ (#faq) — animated accordions (port of the native <details> list). */
export default function Faq() {
  return (
    <section id="faq" className="px-4 py-14">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="section-title"
      >
        <span className="eyebrow">Good to Know</span>
        <h2>Frequently Asked Questions</h2>
        <p>Quick answers about our wigs, delivery, and policies.</p>
      </motion.div>

      <div className="mx-auto flex max-w-[640px] flex-col gap-3">
        {FAQS.map((f, i) => (
          <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
        ))}
      </div>
    </section>
  );
}
