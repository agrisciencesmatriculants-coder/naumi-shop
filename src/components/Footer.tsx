import { Link } from 'react-router';
import { motion } from 'framer-motion';
import CrownLogo from './CrownLogo';
import Icon from './Icon';
import { useGoToSection } from './Header';

const SOCIALS = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/naumicrowns',
    path: 'M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H17V4.9c-.3 0-1.3-.1-2.4-.1-2.3 0-3.9 1.4-3.9 4V11H8.3v3h2.4v7h2.8z',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/naumicrowns',
    path: 'M12 4.2c2.6 0 2.9 0 3.9.1 1 .1 1.5.2 1.8.3.5.2.8.4 1.1.7.3.3.5.6.7 1.1.1.3.3.8.3 1.8.1 1 .1 1.3.1 3.9s0 2.9-.1 3.9c-.1 1-.2 1.5-.3 1.8-.2.5-.4.8-.7 1.1-.3.3-.6.5-1.1.7-.3.1-.8.3-1.8.3-1 .1-1.3.1-3.9.1s-2.9 0-3.9-.1c-1-.1-1.5-.2-1.8-.3-.5-.2-.8-.4-1.1-.7-.3-.3-.5-.6-.7-1.1-.1-.3-.3-.8-.3-1.8-.1-1-.1-1.3-.1-3.9s0-2.9.1-3.9c.1-1 .2-1.5.3-1.8.2-.5.4-.8.7-1.1.3-.3.6-.5 1.1-.7.3-.1.8-.3 1.8-.3 1-.1 1.3-.1 3.9-.1zM12 2.5c-2.6 0-3 0-4 .1-1.1.1-1.8.2-2.4.5-.7.3-1.2.6-1.7 1.1-.5.5-.9 1-1.1 1.7-.3.6-.5 1.3-.5 2.4-.1 1-.1 1.4-.1 4s0 3 .1 4c.1 1.1.2 1.8.5 2.4.3.7.6 1.2 1.1 1.7.5.5 1 .9 1.7 1.1.6.3 1.3.5 2.4.5 1 .1 1.4.1 4 .1s3 0 4-.1c1.1-.1 1.8-.2 2.4-.5.7-.3 1.2-.6 1.7-1.1.5-.5.9-1 1.1-1.7.3-.6.5-1.3.5-2.4.1-1 .1-1.4.1-4s0-3-.1-4c-.1-1.1-.2-1.8-.5-2.4-.3-.7-.6-1.2-1.1-1.7-.5-.5-1-.9-1.7-1.1-.6-.3-1.3-.5-2.4-.5-1-.1-1.4-.1-4-.1zm0 4.6c-2.7 0-4.9 2.2-4.9 4.9s2.2 4.9 4.9 4.9 4.9-2.2 4.9-4.9-2.2-4.9-4.9-4.9zm0 8c-1.7 0-3.1-1.4-3.1-3.1s1.4-3.1 3.1-3.1 3.1 1.4 3.1 3.1-1.4 3.1-3.1 3.1zm5.1-9.3c0 .6-.5 1.1-1.1 1.1s-1.1-.5-1.1-1.1.5-1.1 1.1-1.1 1.1.5 1.1 1.1z',
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@naumicrowns',
    path: 'M16.6 3c.4 2 1.7 3.4 3.9 3.6v3c-1.5 0-2.8-.5-3.9-1.3v5.9c0 3.4-2.5 5.8-5.7 5.8-3.1 0-5.6-2.4-5.6-5.6 0-3.3 2.8-5.8 6.2-5.5v3.1c-1.7-.3-3.1.8-3.1 2.4 0 1.4 1.1 2.5 2.5 2.5 1.6 0 2.6-1.1 2.6-3V3h3.1z',
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/27797519677',
    path: 'M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3c-.8-1.3-1.3-2.9-1.3-4.5 0-4.5 3.7-8.2 8.2-8.2s8.2 3.7 8.2 8.2-3.6 8.4-8 8.4zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.7-1.2-1.5-1.4-1.7-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.7 4.3 3.8.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3z',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@naumicrowns',
    path: 'M21.6 7.2c-.2-.9-1-1.6-1.9-1.8C18 5 12 5 12 5s-6 0-7.7.4c-.9.2-1.7.9-1.9 1.8C2 8.9 2 12 2 12s0 3.1.4 4.8c.2.9 1 1.6 1.9 1.8C6 19 12 19 12 19s6 0 7.7-.4c.9-.2 1.7-.9 1.9-1.8.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8zM10 15V9l5.2 3L10 15z',
  },
];

/** Dark plum footer (design.md §7.5), ported from the approved page. */
export default function Footer() {
  const goToSection = useGoToSection();
  const year = new Date().getFullYear();

  const colReveal = (i: number) => ({
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.8, ease: 'easeOut' as const, delay: i * 0.1 },
  });

  return (
    <footer
      id="contact"
      className="relative overflow-hidden px-4 pb-8 pt-16 text-white"
      style={{ background: 'linear-gradient(135deg, #17120E 0%, #3B332B 100%)' }}
    >
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-petal to-transparent" />

      <div className="mx-auto flex flex-col gap-8 text-center">
        {/* Brand + contact */}
        <motion.div {...colReveal(0)} className="flex flex-col items-center gap-4">
          <Link to="/" aria-label="NaumiCrowns home">
            <CrownLogo dark />
          </Link>
          <div className="space-y-2 text-sm text-white/75">
            <p className="flex items-center justify-center gap-2">
              <Icon name="location_on" size={1} className="text-rose-petal" />
              Johannesburg &amp; Polokwane, South Africa
            </p>
            <p className="flex items-center justify-center gap-2">
              <Icon name="phone" size={1} className="text-rose-petal" />
              <a href="tel:+27797519677" className="transition-colors hover:text-rose-petal">
                +27 79 751 9677
              </a>
            </p>
            <p className="flex items-center justify-center gap-2">
              <Icon name="email" size={1} className="text-rose-petal" />
              <a
                href="mailto:teffokgothatso9@gmail.com"
                className="transition-colors hover:text-rose-petal"
              >
                teffokgothatso9@gmail.com
              </a>
            </p>
          </div>
          <div className="mt-1 flex justify-center gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-rose-petal/20 bg-rose-petal/10 text-rose-petal transition-all hover:-translate-y-1 hover:-rotate-[8deg] hover:border-transparent hover:bg-gradient-to-br hover:from-rose-petal hover:to-berry hover:text-white hover:shadow-[0_8px_20px_rgba(33,27,22,0.4)]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Customer Care */}
        <motion.div {...colReveal(1)}>
          <h4 className="mb-4 font-sans text-base font-semibold uppercase tracking-[1.5px] text-rose-petal">
            Customer Care
          </h4>
          <ul className="space-y-3 text-sm">
            <li>
              <Link to="/track" className="footer-link">
                Track Your Order
              </Link>
            </li>
            <li>
              <button type="button" onClick={() => goToSection('contact')} className="footer-link">
                Contact Us
              </button>
            </li>
            <li>
              <button type="button" onClick={() => goToSection('policies')} className="footer-link">
                Store Policies
              </button>
            </li>
            <li>
              <button type="button" onClick={() => goToSection('policies')} className="footer-link">
                Returns &amp; Exchanges
              </button>
            </li>
            <li>
              <button type="button" onClick={() => goToSection('shop')} className="footer-link">
                Size Guide
              </button>
            </li>
          </ul>
        </motion.div>

        {/* Discover */}
        <motion.div {...colReveal(2)}>
          <h4 className="mb-4 font-sans text-base font-semibold uppercase tracking-[1.5px] text-rose-petal">
            Discover
          </h4>
          <ul className="space-y-3 text-sm">
            <li>
              <a href="/about/" className="footer-link inline-block text-left">
                About NaumiCrowns
              </a>
            </li>
            <li>
              <button type="button" onClick={() => goToSection('shop')} className="footer-link">
                Reviews
              </button>
            </li>
            <li>
              <button type="button" onClick={() => goToSection('faq')} className="footer-link">
                FAQs
              </button>
            </li>
            <li>
              <button type="button" onClick={() => goToSection('shop')} className="footer-link">
                Blog &amp; Tutorials
              </button>
            </li>
          </ul>
        </motion.div>

        {/* Why Shop With Us */}
        <motion.div {...colReveal(3)}>
          <h4 className="mb-4 font-sans text-base font-semibold uppercase tracking-[1.5px] text-rose-petal">
            Why Shop With Us
          </h4>
          <ul className="space-y-3 text-sm">
            <li><span className="footer-link">High Quality. Low Prices.</span></li>
            <li><span className="footer-link">Secure Payments</span></li>
            <li><span className="footer-link">Fast National Delivery</span></li>
            <li><span className="footer-link">AI Stylist Assistance</span></li>
          </ul>
        </motion.div>
      </div>

      <div className="mx-auto mt-10 border-t border-white/10 pt-6 text-center text-[0.85rem] text-white/50">
        <p className="script text-base text-rose-petal">Made with love in South Africa</p>
        <p className="mt-2">
          &copy; {year} NaumiCrowns. All Rights Reserved. | High Quality. Low Prices. | Crown Every Queen.
        </p>
      </div>
    </footer>
  );
}
