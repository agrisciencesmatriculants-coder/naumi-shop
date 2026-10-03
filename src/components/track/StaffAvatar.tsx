import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Staff avatar with graceful fallback: shows the generated portrait when
 * available, otherwise a blush→rose-petal gradient circle with initials
 * and a pulsing online dot (design.md §7.4 grammar).
 */
export default function StaffAvatar({
  src,
  name,
  size = 48,
  className,
}: {
  /** e.g. "/avatar-swift.png" — falls back to initials when missing */
  src: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden={!failed}
        className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-blush to-rose-petal font-display font-bold text-berry"
        style={{ fontSize: size * 0.36 }}
      >
        {initials}
      </span>
      {!failed && (
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
        />
      )}
      <span
        aria-hidden="true"
        className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-online"
        style={{
          width: size * 0.28,
          height: size * 0.28,
          animation: 'ncPulse 1.6s ease-in-out infinite',
        }}
      />
    </span>
  );
}
