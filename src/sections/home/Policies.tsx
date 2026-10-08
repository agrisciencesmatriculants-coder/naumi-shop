import { motion } from 'framer-motion';
import Icon from '@/components/Icon';

/** Copy verbatim from the approved page (design.md §10). */
const CARDS: { icon: string; title: string; points: { bold?: string; text: string }[] }[] = [
  {
    icon: 'auto_awesome',
    title: 'About NaumiCrowns',
    points: [
      { text: 'Based in JHB & Polokwane, we make our own wigs and frontals in-house.' },
      { text: 'Our mission: Make you look and feel like royalty without breaking the bank.' },
      { text: 'Every "crown" is carefully handcrafted and inspected before it leaves our workshop.' },
      { text: 'Loved by over 500+ ladies across South Africa.' },
    ],
  },
  {
    icon: 'local_shipping',
    title: 'Shipping & Delivery',
    points: [
      { bold: 'Processing:', text: ' 1 to 2 days (weekdays and weekends) before dispatch.' },
      { bold: 'Delivery:', text: ' Takes 2 to 6 business working days.' },
      { bold: 'Made In-House:', text: ' We make our own wigs, so we ship directly from our workshop for fast turnaround.' },
      { bold: 'Partners:', text: ' Shipped nationwide via Paxi (PEP) & PostNet.' },
      { bold: 'Weekends:', text: ' No shipments on weekends or public holidays.' },
      { bold: 'Late Delivery Promise:', text: ' If it takes more than 6 business days, you get R50 off your next purchase.' },
    ],
  },
  {
    icon: 'autorenew',
    title: 'Returns & Exchanges',
    points: [
      { bold: 'No Refunds:', text: " Due to hygiene, we don't offer cash refunds." },
      { bold: 'Exchanges:', text: ' Allowed within 5 days of receiving your order on certain products.' },
      { bold: 'Condition:', text: ' Lace must NOT be cut, trimmed, or altered. Wig must be unworn.' },
      { bold: 'Costs:', text: ' Customers cover the return shipping costs.' },
      { bold: 'Defective?', text: ' Notify us within 7 days for a replacement or store credit.' },
    ],
  },
  {
    icon: 'credit_card',
    title: 'Payments & Orders',
    points: [
      { bold: '100% Upfront:', text: ' Full payment required to secure your order.' },
      { bold: 'Secure Checkout:', text: ' Safe and encrypted payment gateways.' },
      { bold: 'Price Lock:', text: " Prices are locked at checkout. Later sales don't apply." },
      { bold: 'Out of Stock?', text: " We'll notify you immediately and start crafting your order." },
    ],
  },
];

/** The NaumiCrowns Promise (#policies) — 4 glass info cards, verbatim copy. */
export default function Policies() {
  return (
    <section
      id="policies"
      className="relative px-4 py-14"
      style={{ background: 'linear-gradient(180deg, #FBF8F1 0%, #F4EEDF 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="section-title"
      >
        <span className="eyebrow">Our Promise</span>
        <h2>The NaumiCrowns Promise</h2>
        <p>Simple, transparent policies designed with you in mind.</p>
      </motion.div>

      <div className="mx-auto grid max-w-[1300px] grid-cols-1 gap-5">
        {CARDS.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.12 }}
            className="group relative overflow-hidden rounded-3xl border border-rose-petal/40 bg-white/70 p-6 shadow-pink backdrop-blur-xl transition-all duration-300 hover:-translate-y-2.5 hover:border-rose-petal hover:shadow-float"
          >
            {/* blush glow on hover */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-1/2 -top-1/2 h-[200px] w-[200px] rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-70"
              style={{ background: 'radial-gradient(circle, #F4EEDF, transparent 70%)' }}
            />
            <div
              className="relative z-[2] mb-5 flex h-[50px] w-[50px] items-center justify-center rounded-2xl text-white shadow-[0_8px_20px_rgba(33,27,22,0.3)]"
              style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
            >
              <Icon name={card.icon} size={1.4} />
            </div>
            <h3 className="relative z-[2] mb-4 font-display text-[1.4rem] font-semibold text-berry">
              {card.title}
            </h3>
            <ul className="relative z-[2] space-y-3.5">
              {card.points.map((p, j) => (
                <li key={j} className="relative pl-6 text-[0.9rem] leading-relaxed text-charcoal">
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-2 h-2 w-2 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
                  />
                  {p.bold && <strong className="text-berry">{p.bold}</strong>}
                  {p.text}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
