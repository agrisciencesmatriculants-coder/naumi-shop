import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * Material Icons (Rounded) glyph, consistent with the approved homepage.
 * Ligature-based: <Icon name="shopping_bag" />
 *
 * Safety: if the icon font is slow/blocked, the ligature word (e.g.
 * "shopping_bag") renders as plain text in a fallback font and can be FAR
 * wider than the glyph box — overlapping neighbouring buttons and breaking
 * navigation taps. The fixed em-box + overflow hidden clips that fallback
 * text to the glyph's footprint so layout never breaks.
 */
export default function Icon({
  name,
  className,
  style,
  size,
}: {
  name: string;
  className?: string;
  style?: CSSProperties;
  /** font-size in rem */
  size?: number;
}) {
  const rem = size ?? 1.5;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'material-icons-round inline-block shrink-0 select-none overflow-hidden whitespace-nowrap text-center align-middle leading-none',
        className,
      )}
      style={{
        fontSize: `${rem}rem`,
        width: `${rem}rem`,
        height: `${rem}rem`,
        lineHeight: `${rem}rem`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
