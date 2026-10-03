/**
 * NaumiCrowns product catalog — the locked list of 9 products in 3 categories.
 * Product images are user-provided GitHub raw URLs (do not regenerate).
 */

export type Category = 'bob' | 'bouncy' | 'human';

export interface Product {
  id: string;
  name: string;
  /** length in inches, e.g. 8 */
  length: number;
  /** price in ZAR (whole rands) */
  price: number;
  category: Category;
  image: string;
  /** corner badge shown on the card (approved page variants) */
  badge?: 'Bestseller' | 'Popular' | 'Premium' | 'New' | 'Best Value';
  /** short description line for cards / quick view */
  description: string;
}

/* Product photos ship INSIDE the app (public/products/) — vendored from the
   naomistorepictures repo so no external host can break or block them. */
export const IMAGE_BASE = '/products';

export const PRODUCTS: Product[] = [
  {
    id: 'bob8',
    name: 'Bob 8"',
    length: 8,
    price: 350,
    category: 'bob',
    image: `${IMAGE_BASE}/bob.jpeg`,
    badge: 'Bestseller',
    description:
      'Sleek, chic 8-inch Bob — the everyday slay our queens love most. Handcrafted and inspected in-house.',
  },
  {
    id: 'bob10',
    name: 'Bob 10"',
    length: 10,
    price: 450,
    category: 'bob',
    image: `${IMAGE_BASE}/bob1.jpeg`,
    description:
      'A 10-inch Bob with a little extra swish. Soft, natural movement and effortless styling.',
  },
  {
    id: 'bob12',
    name: 'Bob 12"',
    length: 12,
    price: 550,
    category: 'bob',
    image: `${IMAGE_BASE}/bob2.jpeg`,
    badge: 'Popular',
    description:
      'Our most-loved 12-inch Bob — the perfect balance of elegance and everyday wear.',
  },
  {
    id: 'bob14',
    name: 'Bob 14"',
    length: 14,
    price: 650,
    category: 'bob',
    image: `${IMAGE_BASE}/bob.jpeg`,
    badge: 'Premium',
    description:
      'The premium 14-inch Bob — fuller, longer, and finished to perfection in our workshop.',
  },
  {
    id: 'bouncy26',
    name: 'Bouncy Blend 26"',
    length: 26,
    price: 680,
    category: 'bouncy',
    image: `${IMAGE_BASE}/bouncy-human-hair.jpeg`,
    badge: 'New',
    description:
      'Bouncy Human Blend in 26 inches — soft curls, gorgeous volume, and a natural bounce.',
  },
  {
    id: 'bouncy28',
    name: 'Bouncy Blend 28"',
    length: 28,
    price: 720,
    category: 'bouncy',
    image: `${IMAGE_BASE}/bouncy-human-hair2.jpeg`,
    description:
      'Bouncy Human Blend in 28 inches — bombshell volume that turns heads everywhere.',
  },
  {
    id: 'bouncy30',
    name: 'Bouncy Blend 30"',
    length: 30,
    price: 750,
    category: 'bouncy',
    image: `${IMAGE_BASE}/bouncy-human-hair3.jpeg`,
    description:
      'The showstopper: 30 inches of bouncy, full-bodied Human Blend glamour.',
  },
  {
    id: 'human28',
    name: 'Human Blend 28"',
    length: 28,
    price: 680,
    category: 'human',
    image: `${IMAGE_BASE}/human-hair-blend.jpeg`,
    badge: 'Best Value',
    description:
      'Human Hair Blend in 28 inches — silky, full, and super natural looking. Best value in the house.',
  },
  {
    id: 'human30',
    name: 'Human Blend 30"',
    length: 30,
    price: 700,
    category: 'human',
    image: `${IMAGE_BASE}/human-hair-blend2.jpeg`,
    description:
      'Human Hair Blend in 30 inches — long, soft, and luxuriously natural.',
  },
];

export const CATEGORY_META: Record<Category, { label: string; tag: string }> = {
  bob: { label: 'Bob', tag: 'Bob' },
  bouncy: { label: 'Bouncy Human Blend', tag: 'Bouncy Human Blend' },
  human: { label: 'Human Hair Blend', tag: 'Human Hair Blend' },
};

export type CategoryFilter = 'all' | Category;

export const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Wigs' },
  { id: 'bob', label: 'Bob' },
  { id: 'bouncy', label: 'Bouncy Human Blend' },
  { id: 'human', label: 'Human Hair Blend' },
];

/** Locked copy — every product ships in 2-6 business working days. */
export const DELIVERY_BADGE = 'Ships in 2-6 Days';

/** Free delivery threshold in ZAR. */
export const FREE_DELIVERY_THRESHOLD = 2500;

export interface Courier {
  id: string;
  name: string;
  /** default fee in ZAR (admin-editable server-side) */
  fee: number;
  eta: string;
  note: string;
}

export const COURIERS: Record<'paxi' | 'postnet', Courier> = {
  paxi: {
    id: 'paxi',
    name: 'Paxi (PEP Stores)',
    fee: 60,
    eta: '2-4 working days',
    note: 'Collect at any PEP nationwide',
  },
  postnet: {
    id: 'postnet',
    name: 'PostNet',
    fee: 100,
    eta: '1-3 working days',
    note: 'Counter-to-counter delivery',
  },
};

/** Format a ZAR amount as "R 1 234.00" (approved page style). */
export function formatPrice(amount: number): string {
  const [int, dec] = Math.abs(amount).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${amount < 0 ? '-' : ''}R ${grouped}.${dec}`;
}

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
