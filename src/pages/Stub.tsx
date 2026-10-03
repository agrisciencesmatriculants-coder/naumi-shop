import { Link } from 'react-router';
import { motion } from 'framer-motion';
import Icon from '@/components/Icon';

/**
 * Placeholder page used until the owning page agent delivers the real
 * implementation. Styled in the locked palette inside the app shell.
 */
export default function Stub({
  title,
  subtitle,
  icon = 'auto_awesome',
}: {
  title: string;
  subtitle?: string;
  icon?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_8px_25px_rgba(33,27,22,0.35)]"
        style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
      >
        <Icon name={icon} size={1.8} />
      </div>
      <h1 className="font-display text-3xl font-bold text-berry">{title}</h1>
      {subtitle && <p className="max-w-[300px] text-sm text-rose-deep">{subtitle}</p>}
      <p className="script text-lg text-rose-mid">coming soon</p>
      <Link
        to="/"
        className="mt-2 rounded-full bg-gradient-to-br from-berry to-berry-deep px-6 py-3 text-xs font-semibold uppercase tracking-[1.5px] text-white shadow-[0_8px_25px_rgba(33,27,22,0.35)] transition-transform hover:-translate-y-0.5"
      >
        Back to Shop
      </Link>
    </motion.div>
  );
}
