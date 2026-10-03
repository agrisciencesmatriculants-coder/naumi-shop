import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CrownGlyph } from './CrownLogo';

/**
 * Product image with graceful fallback: if the remote GitHub image
 * fails to load, show the approved blush→rose-petal gradient with a
 * crown glyph watermark.
 */
export default function ProductImage({
  src,
  alt,
  className,
  width = 960,
  height = 1280,
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-blush to-rose-petal text-berry/40',
          className,
        )}
      >
        <CrownGlyph size={Math.min(width, height) / 4} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
