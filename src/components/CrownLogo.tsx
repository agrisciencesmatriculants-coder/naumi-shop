import { cn } from '@/lib/utils';

/** Crown glyph ported from the approved homepage (inline SVG). */
export function CrownGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden="true">
      <path d="M2.5 18.5h19l-1.6-9.2-4.9 3.9L12 5.5 8.9 13.2l-4.9-3.9-1.5 9.2zm0 2h19v1.5h-19v-1.5z" />
    </svg>
  );
}

/**
 * Brand logo lockup: gradient circle with floating crown +
 * "NaumiCrowns" wordmark + "Premium Hair Atelier" tag.
 */
export default function CrownLogo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[0_4px_15px_rgba(33,27,22,0.4)]"
        style={{
          background: 'linear-gradient(135deg, #E3D5BC, #211B16)',
          animation: 'crownFloat 3s ease-in-out infinite',
        }}
      >
        <CrownGlyph size={18} />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            'block font-display text-xl font-bold leading-none',
            dark ? 'text-white' : 'text-berry',
          )}
        >
          NaumiCrowns
        </span>
        <span className="script -mt-0.5 block text-[0.7rem] leading-tight text-rose-mid">
          Premium Hair Atelier
        </span>
      </span>
    </span>
  );
}
