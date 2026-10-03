import { motion } from 'framer-motion';
import Icon from '@/components/Icon';

const ITEMS = [
  {
    icon: 'inventory_2',
    title: 'Paxi (Pep Stores)',
    line1: '2-4 Working Days',
    line2: 'Collect at any PEP nationwide',
  },
  {
    icon: 'local_shipping',
    title: 'PostNet',
    line1: '1-3 Working Days',
    line2: 'Counter-to-counter delivery',
  },
  {
    icon: 'schedule',
    title: 'Processing Time',
    line1: '1-2 Days',
    line2: 'Before dispatch (weekdays & weekends)',
  },
];

/** Delivered With Love (#delivery) — verbatim copy, berry gradient section. */
export default function Delivery() {
  return (
    <section
      id="delivery"
      className="relative overflow-hidden px-4 py-14 text-center text-white"
      style={{ background: 'linear-gradient(135deg, #211B16 0%, #151110 100%)' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(244,238,223,0.2) 0%, transparent 25%), radial-gradient(circle at 85% 80%, rgba(211,190,145,0.2) 0%, transparent 25%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-[2]"
      >
        <span className="script mb-2 block text-2xl text-rose-petal">effortless, beautiful</span>
        <h2 className="text-[1.85rem] font-bold text-white">Delivered With Love</h2>
        <p className="mx-auto mt-3 max-w-[720px] text-[0.95rem] opacity-90">
          We make our own wigs in-house. Shipping is fast because we ship directly from our
          workshop. Nationwide delivery, free over R2500.
        </p>
      </motion.div>

      <div className="relative z-[2] mx-auto mt-10 flex max-w-[1000px] flex-col gap-4">
        {ITEMS.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.15 }}
            className="flex flex-col items-center gap-3 rounded-[20px] border border-white/20 bg-white/10 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:bg-white/15 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
          >
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-berry shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
              style={{
                background: 'linear-gradient(135deg, #F4EEDF, #E3D5BC)',
                animation: `iconBob 3s ease-in-out ${i * 0.5}s infinite`,
              }}
            >
              <Icon name={item.icon} size={2.4} />
            </div>
            <h4 className="font-display text-xl font-semibold">{item.title}</h4>
            <p className="text-[0.85rem] opacity-85">{item.line1}</p>
            <p className="text-xs opacity-70">{item.line2}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        className="relative z-[2] mx-auto mt-10 flex max-w-[720px] flex-col items-center justify-center gap-2 rounded-[20px] border border-rose-petal/30 p-5 text-center backdrop-blur"
        style={{ background: 'linear-gradient(135deg, rgba(244,238,223,0.2), rgba(211,190,145,0.1))' }}
      >
        <Icon name="verified" size={1.8} className="text-gold" />
        <p className="text-[0.95rem]">
          Delivery takes <strong className="text-rose-petal">2 to 6 business working days</strong>.
          If it takes more than 6 days, you get <strong className="text-rose-petal">R50 off</strong>{' '}
          your next purchase — guaranteed.
        </p>
      </motion.div>
    </section>
  );
}
