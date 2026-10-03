import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Product } from '@/lib/catalog';
import { getProduct } from '@/lib/catalog';

/* ============================================================
   NaumiCrowns client store (guest scope).
   Cart + likes persist to localStorage; auth/user state is
   grafted in a later phase via useAuth — do NOT add it here.
   ============================================================ */

const CART_KEY = 'nc_cart';
const LIKED_KEY = 'nc_liked';
const TOAST_TTL = 2200;

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMsg {
  id: number;
  msg: string;
  type: ToastType;
}

interface AppState {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;

  liked: string[];
  isLiked: (id: string) => boolean;
  toggleLike: (id: string) => void;

  toasts: ToastMsg[];
  showToast: (msg: string, type?: ToastType) => void;

  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { id: string; qty: number }[];
    if (!Array.isArray(parsed)) return [];
    // Re-hydrate from the catalog so names/prices/images are always current.
    return parsed
      .map((entry) => {
        const p = getProduct(entry.id);
        if (!p) return null;
        return {
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image,
          qty: Math.max(1, Math.floor(entry.qty) || 1),
        } satisfies CartItem;
      })
      .filter((x): x is CartItem => x !== null);
  } catch {
    return [];
  }
}

function readLiked(): string[] {
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(readCart);
  const [liked, setLiked] = useState<string[]>(readLiked);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const toastId = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart.map(({ id, qty }) => ({ id, qty }))));
    } catch {
      /* storage unavailable */
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(LIKED_KEY, JSON.stringify(liked));
    } catch {
      /* storage unavailable */
    }
  }, [liked]);

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, msg, type }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, TOAST_TTL);
  }, []);

  const addToCart = useCallback(
    (product: Product, qty: number = 1) => {
      setCart((c) => {
        const existing = c.find((i) => i.id === product.id);
        if (existing) {
          return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i));
        }
        return [
          ...c,
          { id: product.id, name: product.name, price: product.price, image: product.image, qty },
        ];
      });
      showToast('Added to your crown bag');
    },
    [showToast],
  );

  const removeFromCart = useCallback((id: string) => {
    setCart((c) => c.filter((i) => i.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setCart((c) =>
      qty <= 0
        ? c.filter((i) => i.id !== id)
        : c.map((i) => (i.id === id ? { ...i, qty } : i)),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const isLiked = useCallback((id: string) => liked.includes(id), [liked]);

  // Read-then-set (not an updater fn): side effects like toasts must not live
  // inside state updaters — StrictMode double-invokes them and double-toasts.
  const toggleLike = useCallback(
    (id: string) => {
      const has = liked.includes(id);
      setLiked(has ? liked.filter((x) => x !== id) : [...liked, id]);
      showToast(has ? 'Removed from your likes' : 'Added to your likes');
    },
    [liked, showToast],
  );

  const value = useMemo<AppState>(() => {
    const cartCount = cart.reduce((n, i) => n + i.qty, 0);
    const cartTotal = cart.reduce((n, i) => n + i.qty * i.price, 0);
    return {
      cart,
      cartCount,
      cartTotal,
      addToCart,
      removeFromCart,
      setQty,
      clearCart,
      liked,
      isLiked,
      toggleLike,
      toasts,
      showToast,
      cartOpen,
      setCartOpen,
    };
  }, [cart, liked, toasts, cartOpen, addToCart, removeFromCart, setQty, clearCart, isLiked, toggleLike, showToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}
