const ITEMS = [
  'Premium Human Hair',
  'Loved by 500+ Queens',
  'Nationwide Paxi & PostNet Delivery',
  'Bobs, Bouncy & Human Blends',
  'Made with Love in SA',
  '5-Star Quality',
];

/** Berry→rose-deep marquee strip, ×2 for a seamless 30s loop. */
export default function Marquee() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div
      className="relative z-[5] overflow-hidden py-2.5 text-white"
      style={{ background: 'linear-gradient(90deg, #211B16, #7A6B59, #211B16)' }}
      aria-hidden="true"
    >
      <div
        className="marquee-track flex gap-12 whitespace-nowrap"
        style={{ animation: 'marquee 30s linear infinite', width: 'max-content' }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 font-display text-base italic"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-petal" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
