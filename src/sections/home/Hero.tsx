import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import Icon from '@/components/Icon';
import { openConcierge } from '@/components/Concierge';
import { scrollToSection } from '@/components/Header';

/** Count-up over ~1.2s when 50% in view (port of the approved counter). */
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 1200;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  const isDecimal = target % 1 !== 0;
  return (
    <span ref={ref}>
      {(isDecimal ? value.toFixed(1) : Math.floor(value)).toString()}
      {suffix}
    </span>
  );
}

const FLOATING_ICONS = [
  { name: 'spa', className: 'left-[8%] top-[15%]', duration: '8s', reverse: false },
  { name: 'favorite', className: 'right-[10%] top-[25%]', duration: '10s', reverse: true },
  { name: 'auto_awesome', className: 'bottom-[18%] left-[12%]', duration: '12s', reverse: false },
  { name: 'diamond', className: 'bottom-[22%] right-[8%]', duration: '9s', reverse: true },
];

/** Hero — faithful port of the approved page (design §6 timings). */
export default function Hero() {
  return (
    <section
      className="relative flex items-center justify-center overflow-hidden px-4 py-16 text-center"
      style={{
        background:
          'radial-gradient(circle at 20% 30%, rgba(211,190,145,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(244,238,223,0.6) 0%, transparent 50%), linear-gradient(135deg, #F4EEDF 0%, #E3D5BC 50%, #F4EEDF 100%)',
        backgroundSize: '200% 200%',
        animation: 'heroGradient 15s ease infinite',
      }}
    >
      {/* drifting radial dot blooms */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 20%, #E3D5BC 0%, transparent 8%), radial-gradient(circle at 90% 80%, #A9812F 0%, transparent 6%), radial-gradient(circle at 30% 90%, #F2E9CF 0%, transparent 5%), radial-gradient(circle at 70% 10%, #E3D5BC 0%, transparent 7%)',
          animation: 'floatDots 20s linear infinite',
        }}
      />
      {/* floating icons (hidden on ≤520px like the approved page) */}
      {FLOATING_ICONS.map((f) => (
        <div
          key={f.name}
          aria-hidden="true"
          className={`pointer-events-none absolute z-[1] hidden min-[521px]:block ${f.className}`}
          style={{ animation: `floatAround ${f.duration} ease-in-out infinite${f.reverse ? ' reverse' : ''}` }}
        >
          <Icon name={f.name} size={2.5} className="text-rose-petal drop-shadow-[0_4px_10px_rgba(33,27,22,0.3)]" />
        </div>
      ))}

      <div className="relative z-[2] mx-auto max-w-[850px]">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-petal/50 bg-white/70 px-5 py-2 text-[0.85rem] font-medium text-berry shadow-[0_4px_20px_rgba(211,190,145,0.4)] backdrop-blur"
        >
          <Icon name="verified" size={1} />
          South Africa&apos;s Premium Wig Destination
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className="mb-5 text-[2.4rem] font-bold leading-[1.1] text-berry"
        >
          Crowns Worth
          <br />
          <span className="inline-block bg-gradient-to-br from-berry to-rose-mid bg-clip-text font-display italic text-transparent">
            Wearing, Queen.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
          className="mx-auto mb-8 max-w-[620px] text-base text-charcoal"
        >
          Premium quality Bob wigs, Bouncy Human Blends, and Human Hair Blends — made in-house
          and shipped from our workshop in Johannesburg &amp; Polokwane. Every crown tells a story.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
          className="flex flex-col items-stretch justify-center gap-4"
        >
          <button type="button" className="btn-primary" onClick={() => scrollToSection('shop')}>
            Shop The Collection
            <Icon name="arrow_forward" size={1.1} />
          </button>
          <button type="button" className="btn-secondary" onClick={openConcierge}>
            <Icon name="chat_bubble" size={1} />
            Chat with Stylist
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.8 }}
          className="mt-10 flex flex-wrap justify-center gap-5"
        >
          <div className="text-center">
            <div className="font-display text-[1.6rem] font-bold text-berry">
              <CountUp target={500} suffix="+" />
            </div>
            <div className="text-xs text-charcoal/80">Happy Queens</div>
          </div>
          <div className="text-center">
            <div className="font-display text-[1.6rem] font-bold text-berry">
              <CountUp target={9} suffix="+" />
            </div>
            <div className="text-xs text-charcoal/80">Crown Styles</div>
          </div>
          <div className="text-center">
            <div className="font-display text-[1.6rem] font-bold text-berry">100%</div>
            <div className="text-xs text-charcoal/80">Quality Checked</div>
          </div>
          <div className="text-center">
            <div className="font-display text-[1.6rem] font-bold text-berry">
              <CountUp target={4.9} />
            </div>
            <div className="text-xs text-charcoal/80">Star Rating</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
