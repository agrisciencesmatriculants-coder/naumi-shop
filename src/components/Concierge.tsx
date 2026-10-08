import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import { useApp } from '@/store/AppContext';
import {
  BANK_DETAILS,
  STATUS_LABELS,
  listOrdersForUser,
  useCurrentUser,
} from '@/lib/backend';
import {
  CATEGORY_META,
  COURIERS,
  FREE_DELIVERY_THRESHOLD,
  PRODUCTS,
  formatPrice,
} from '@/lib/catalog';
import { MANAGERS, onDutyStylists } from '@/lib/office';
import type { StaffMember } from '@/lib/office';
import { SITE } from '@/lib/site';

/**
 * AI Concierge — the customer-facing chat (design.md §7.4).
 *
 * Fully client-side: the Director routes by current route (tracker →
 * Dr. Swift, checkout/payment → Dr. Tech, else the on-duty sales stylist),
 * a login gate guards the chat, first-open preferences (language + tone)
 * persist to localStorage, and a deterministic keyword engine answers from
 * the locked catalog / business facts. No server, no tokens.
 *
 * Contracts kept from the stub: default export `Concierge`, named export
 * `openConcierge()`, and the `nc:open-concierge` window event.
 */
export function openConcierge() {
  window.dispatchEvent(new CustomEvent('nc:open-concierge'));
}

/* ============================================================
   Types & persistence
   ============================================================ */

type Language = 'English' | 'Sepedi' | 'IsiZulu' | 'IsiXhosa' | 'Afrikaans' | 'Setswana';
type Tone = 'genz' | 'formal';

interface Prefs {
  language: Language;
  tone: Tone;
}

interface MsgLink {
  href: string;
  label: string;
  external?: boolean;
}

interface ChatMsg {
  id: string;
  from: 'ai' | 'user';
  text: string;
  at: number;
  link?: MsgLink;
}

const PREFS_KEY = 'nc_ai_prefs';
const CHAT_KEY = 'nc_concierge_chat';
const NUDGE_KEY = 'nc_idle_nudged';

const LANGUAGES: Language[] = ['English', 'Sepedi', 'IsiZulu', 'IsiXhosa', 'Afrikaans', 'Setswana'];
const DEFAULT_PREFS: Prefs = { language: 'English', tone: 'genz' };

function loadPrefs(): Prefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    if (!parsed.language || !parsed.tone) return null;
    if (!LANGUAGES.includes(parsed.language)) return null;
    if (parsed.tone !== 'genz' && parsed.tone !== 'formal') return null;
    return { language: parsed.language, tone: parsed.tone };
  } catch {
    return null;
  }
}

function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

function loadMessages(): ChatMsg[] {
  try {
    const raw = sessionStorage.getItem(CHAT_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatMsg[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let msgCounter = 0;
function nextId(): string {
  return `ncm_${Date.now().toString(36)}_${msgCounter++}`;
}

/* ============================================================
   Director routing (§7.4) — who answers on which route
   ============================================================ */

function routeResponder(pathname: string): StaffMember {
  const mgr = (id: string) => MANAGERS.find((m) => m.id === id) ?? MANAGERS[0];
  if (pathname.startsWith('/track')) return mgr('mgr_swift'); // Dr. Swift — Inventory & Logistics
  if (pathname.startsWith('/checkout') || pathname.startsWith('/payment'))
    return mgr('mgr_tech'); // Dr. Tech — payments & checkout
  return onDutyStylists()[0]; // the on-duty sales stylist
}

/* ============================================================
   Greetings — language × tone (chat body stays English)
   ============================================================ */

function greetingFor(prefs: Prefs, responder: StaffMember, userName: string): string {
  const name = userName.split(' ')[0] || 'there';
  const role = responder.role;
  const formal = prefs.tone === 'formal';
  const enLine = formal
    ? `I am ${responder.name}, ${role} at NaumiCrowns. How may I assist you today? I can help with prices, sizes, delivery, payment or tracking your order.`
    : `I'm ${responder.name}, your ${role} at NaumiCrowns 💕 Ask me about prices, sizes, delivery, payment or where your order is — let's get you crowned!`;
  switch (prefs.language) {
    case 'Sepedi':
      return `Dumela ${name}! Ke nna ${responder.name}. ${enLine}`;
    case 'IsiZulu':
      return `Sawubona ${name}! Ngingu-${responder.name}. ${enLine}`;
    case 'IsiXhosa':
      return `Molo ${name}! Ndingu-${responder.name}. ${enLine}`;
    case 'Afrikaans':
      return `Hallo ${name}! Ek is ${responder.name}. ${enLine}`;
    case 'Setswana':
      return `Dumela ${name}! Ke nna ${responder.name}. ${enLine}`;
    default:
      return formal ? `Good day, ${name}. ${enLine}` : `Hey ${name}! 👑 ${enLine}`;
  }
}

function handoverLine(responder: StaffMember, tone: Tone): string {
  return tone === 'formal'
    ? `Allow me to introduce myself — ${responder.name}, ${responder.role}. I will take over your enquiry from here.`
    : `Hii, ${responder.name} here — ${responder.role} 💕 I'm taking over, so ask me anything!`;
}

/* ============================================================
   Rule-based reply engine (deterministic, zero network)
   ============================================================ */

interface ReplyCtx {
  userId: string;
  userName: string;
  tone: Tone;
  cartCount: number;
}

interface Reply {
  text: string;
  link?: MsgLink;
}

function priceMenu(): string {
  return PRODUCTS.map((p) => `${p.name} — ${formatPrice(p.price)}`).join('\n');
}

function sizeMenu(): string {
  return (Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[])
    .map((c) => {
      const lengths = PRODUCTS.filter((p) => p.category === c).map((p) => `${p.length}"`).join(', ');
      return `${CATEGORY_META[c].label}: ${lengths}`;
    })
    .join('\n');
}

function priceRange(): string {
  const prices = PRODUCTS.map((p) => p.price);
  return `${formatPrice(Math.min(...prices))} to ${formatPrice(Math.max(...prices))}`;
}

function categoryRange(c: keyof typeof CATEGORY_META): string {
  const prices = PRODUCTS.filter((p) => p.category === c).map((p) => p.price);
  return `${formatPrice(Math.min(...prices))}–${formatPrice(Math.max(...prices))}`;
}

function orderStatusReply(ctx: ReplyCtx, genz: boolean): Reply {
  const orders = listOrdersForUser(ctx.userId);
  if (!orders.length) {
    return {
      text: genz
        ? `You haven't placed an order yet, ${ctx.userName.split(' ')[0]} — your crown is still waiting in the shop! 👑`
        : 'You have no orders on record yet. Once you place one, I can track it for you here.',
      link: { href: '/', label: 'Shop crowns' },
    };
  }
  const o = orders[0];
  const items = o.items.map((i) => `${i.qty}× ${i.name}`).join(', ');
  const lateBit = o.latePromiseNote
    ? ' It arrived later than promised, so R50 off your next purchase is locked in.'
    : '';
  return {
    text: genz
      ? `Found it! Your latest order ${o.id} (${items} — ${formatPrice(o.total)}) is at "${STATUS_LABELS[o.status]}" right now.${lateBit} Follow it live below 💕`
      : `Your most recent order ${o.id} (${items} — ${formatPrice(o.total)}) is currently at "${STATUS_LABELS[o.status]}".${lateBit} You can follow every step on the tracker.`,
    link: { href: `/track/${o.id}`, label: 'Track my order' },
  };
}

function craftReply(raw: string, ctx: ReplyCtx): Reply {
  const q = raw.toLowerCase();
  const has = (...words: string[]) => words.some((w) => q.includes(w));
  const genz = ctx.tone === 'genz';
  const freeAt = formatPrice(FREE_DELIVERY_THRESHOLD);
  const whatsapp: MsgLink = { href: SITE.whatsapp, label: 'Chat on WhatsApp', external: true };

  // --- greetings ---
  if (q.length < 30 && has('hello', 'hi', 'hey', 'dumela', 'sawubona', 'molo', 'heita', 'hola')) {
    return {
      text: genz
        ? `Hi there! 💕 What can I do for you — prices, delivery, payment, or tracking your order?`
        : 'Hello. How may I assist you — prices, delivery, payment, or order tracking?',
    };
  }

  // --- order status ---
  if (has('track', 'my order', 'order status', 'where is my', "where's my", 'parcel', 'package')) {
    return orderStatusReply(ctx, genz);
  }

  // --- late delivery promise ---
  if (has('late', 'delay', 'taking long', 'r50', '6 days', 'six days')) {
    return {
      text: genz
        ? `Our promise, queen: delivery takes 2 to 6 business working days. If it takes more than 6 days, you get R50 off your next purchase — guaranteed. No stress! 👑`
        : 'Delivery takes 2 to 6 business working days. If it takes more than 6 days, you get R50 off your next purchase — guaranteed.',
    };
  }

  // --- returns / exchanges ---
  if (has('return', 'exchange', 'refund', 'swap')) {
    return {
      text: genz
        ? `We do a 5-day exchange, queen — as long as the lace is uncut and the wig is unworn, we'll swap it for you. No cash refunds, but we will make it right 💕 WhatsApp us and we'll sort it fast.`
        : 'We offer a 5-day exchange: the lace must be uncut and the wig unworn. Please note we do not offer cash refunds. Contact us on WhatsApp to arrange an exchange.',
      link: whatsapp,
    };
  }

  // --- delivery ---
  if (has('deliver', 'shipping', 'ship', 'courier', 'paxi', 'postnet', 'how long', 'arrive', 'days', 'pep')) {
    return {
      text: genz
        ? `Delivery takes 2 to 6 business working days, queen! 🚚\n• ${COURIERS.paxi.name} — ${formatPrice(COURIERS.paxi.fee)}, ${COURIERS.paxi.eta}\n• ${COURIERS.postnet.name} — ${formatPrice(COURIERS.postnet.fee)}, ${COURIERS.postnet.eta}\nFree delivery over ${freeAt}! We deliver to Johannesburg and Polokwane.`
        : `Delivery takes 2 to 6 business working days.\n• ${COURIERS.paxi.name} — ${formatPrice(COURIERS.paxi.fee)}, ${COURIERS.paxi.eta}\n• ${COURIERS.postnet.name} — ${formatPrice(COURIERS.postnet.fee)}, ${COURIERS.postnet.eta}\nDelivery is free on orders over ${freeAt}. We currently deliver to Johannesburg and Polokwane.`,
    };
  }

  // --- payment ---
  if (has('pay', 'payshap', 'capitec', 'bank', 'eft', 'deposit', 'account number', 'upfront')) {
    const details = `Bank: ${BANK_DETAILS.bank}\nAccount Name: ${BANK_DETAILS.accountName}\nAccount Number: ${BANK_DETAILS.accountNumber}\nBranch Code: ${BANK_DETAILS.branchCode}\nPayShap Number: ${BANK_DETAILS.payshapNumber}`;
    return {
      text: genz
        ? `Payment is 100% upfront via PayShap or Capitec cellphone pay, queen 💳\n${details}\nAt checkout you choose: we send you a payment request to approve, or you send it yourself and upload the proof. Easy!`
        : `Payment is 100% upfront via PayShap or Capitec cellphone pay.\n${details}\nAt checkout you may either approve a payment request we send you, or send the amount yourself and upload proof of payment.`,
    };
  }

  // --- prices ---
  if (has('price', 'cost', 'how much', 'much')) {
    return {
      text: genz
        ? `The full crown menu, queen 👑\n${priceMenu()}\nThat's ${priceRange()} — and delivery is free over ${freeAt}!`
        : `Our current price list:\n${priceMenu()}\nPrices range from ${priceRange()}. Delivery is free on orders over ${freeAt}.`,
    };
  }

  // --- sizes / lengths ---
  if (has('size', 'length', 'inch', '"', 'what lengths')) {
    return {
      text: genz
        ? `Here's what we've got, queen:\n${sizeMenu()}\nBobs sit around chin-to-shoulder; 26"–30" reaches the waist. Want a recommendation? 💕`
        : `Available lengths by range:\n${sizeMenu()}\nBobs sit around chin to shoulder length; 26"–30" reaches approximately the waist.`,
    };
  }

  // --- product range / stock / recommendations ---
  if (
    has(
      'wig', 'bob', 'bouncy', 'human', 'blend', 'product', 'stock', 'range',
      'sell', 'catalog', 'available', 'recommend', 'best', 'lace', 'frontal', 'hair',
    )
  ) {
    const best = PRODUCTS.find((p) => p.badge === 'Bestseller') ?? PRODUCTS[0];
    return {
      text: genz
        ? `We handcraft every wig in-house, queen — three ranges:\n• ${CATEGORY_META.bob.label} (${categoryRange('bob')})\n• ${CATEGORY_META.bouncy.label} (${categoryRange('bouncy')})\n• ${CATEGORY_META.human.label} (${categoryRange('human')})\nThe ${best.name} is our bestseller for a reason — ${formatPrice(best.price)}! ✨`
        : `All our wigs are handcrafted in-house across three ranges: ${CATEGORY_META.bob.label}, ${CATEGORY_META.bouncy.label} and ${CATEGORY_META.human.label}. Our bestseller is the ${best.name} at ${formatPrice(best.price)}. Shall I point you to the shop?`,
      link: { href: '/', label: 'Browse the shop' },
    };
  }

  // --- ordering / cart / checkout ---
  if (has('order', 'buy', 'purchase', 'checkout', 'cart', 'bag')) {
    const cartBit =
      ctx.cartCount > 0
        ? genz
          ? `Your bag already has ${ctx.cartCount} crown(s) — checkout takes two minutes! `
          : `You have ${ctx.cartCount} item(s) in your bag. `
        : '';
    return {
      text: genz
        ? `${cartBit}It's simple, queen: add a wig to your bag → checkout → choose Johannesburg or Polokwane + Paxi or PostNet → pay via PayShap or Capitec → we craft and ship in 2–6 business days 👑`
        : `${cartBit}Ordering is simple: add a wig to your bag, proceed to checkout, choose Johannesburg or Polokwane with Paxi or PostNet, then pay via PayShap or Capitec. We craft and ship within 2–6 business days.`,
      link: ctx.cartCount > 0 ? { href: '/checkout', label: 'Go to checkout' } : { href: '/', label: 'Shop crowns' },
    };
  }

  // --- hours / contact / human ---
  if (has('hour', 'open', 'close', 'contact', 'phone', 'number', 'email', 'whatsapp', 'human', 'agent', 'person', 'speak')) {
    return {
      text: genz
        ? `You can reach our team anytime on WhatsApp ${SITE.naumiPhone} or email teffokgothatso9@gmail.com — replies are fast. I'm also here 24/7 for the quick stuff!`
        : `You can reach our team on WhatsApp at ${SITE.naumiPhone} or by email at teffokgothatso9@gmail.com. I am available here at any time for general questions.`,
      link: whatsapp,
    };
  }

  // --- thanks ---
  if (has('thank', 'thanks', 'sharp', 'ngiyabonga', 'ke a leboga', 'enkosi')) {
    return {
      text: genz
        ? `Always, queen! 👑 Go be gorgeous — and remember, free delivery over ${freeAt}.`
        : `You are most welcome. Do not hesitate to ask if you need anything else.`,
    };
  }

  // --- fallback: graceful WhatsApp handoff ---
  return {
    text: genz
      ? `Yoh, you've stumped me, queen 😅 A human will know for sure — tap below and we'll answer you on WhatsApp in a flash.`
      : 'I do not have that information to hand, but our team will gladly assist. You can reach us directly on WhatsApp.',
    link: whatsapp,
  };
}

/* ============================================================
   Small hooks
   ============================================================ */

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/* ============================================================
   Component
   ============================================================ */

const QUICK_PROMPTS = ['Delivery?', 'Prices', "Where's my order?", 'Payment'];

export default function Concierge() {
  const { pathname } = useLocation();
  const user = useCurrentUser();
  const { cartCount } = useApp();
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs | null>(loadPrefs);
  const [draft, setDraft] = useState<Prefs>(DEFAULT_PREFS);
  const [showSetup, setShowSetup] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>(loadMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [teaser, setTeaser] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const replyTimerRef = useRef<number | undefined>(undefined);
  const greetPendingRef = useRef(false);
  const prevResponderRef = useRef<string | null>(null);
  const cartSinceRef = useRef<number | null>(null);
  const nudgedRef = useRef(false);
  try {
    nudgedRef.current = nudgedRef.current || sessionStorage.getItem(NUDGE_KEY) === '1';
  } catch {
    /* storage unavailable */
  }

  const responder = routeResponder(pathname);
  const view: 'guest' | 'setup' | 'chat' = !user ? 'guest' : prefs === null || showSetup ? 'setup' : 'chat';

  /* ---------- external open contract ---------- */
  const handleExternal = useCallback(() => {
    setTeaser(null);
    setOpen(true);
  }, []);
  useEffect(() => {
    window.addEventListener('nc:open-concierge', handleExternal);
    return () => window.removeEventListener('nc:open-concierge', handleExternal);
  }, [handleExternal]);

  /* ---------- persist messages per session ---------- */
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-60)));
    } catch {
      /* storage unavailable */
    }
  }, [messages]);

  /* ---------- autoscroll ---------- */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [messages, typing, reduced]);

  /* ---------- greeting on first open of the chat view ---------- */
  useEffect(() => {
    if (!open || view !== 'chat' || !user || greetPendingRef.current || messages.length > 0) return;
    greetPendingRef.current = true;
    setTyping(true);
    const t = window.setTimeout(
      () => {
        setTyping(false);
        setMessages([
          { id: nextId(), from: 'ai', text: greetingFor(prefs ?? DEFAULT_PREFS, responder, user.name), at: Date.now() },
        ]);
      },
      reduced ? 60 : 750,
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, view, user]);

  /* ---------- Director handover when the route (and responder) changes mid-chat ---------- */
  useEffect(() => {
    if (prevResponderRef.current === null) {
      prevResponderRef.current = responder.id;
      return;
    }
    if (prevResponderRef.current !== responder.id) {
      const changedDuringChat = open && messages.length > 0;
      prevResponderRef.current = responder.id;
      if (changedDuringChat) {
        setMessages((m) => [
          ...m,
          { id: nextId(), from: 'ai' as const, text: handoverLine(responder, prefs?.tone ?? 'genz'), at: Date.now() },
        ]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responder.id, open, messages.length]);

  /* ---------- cart-age tracking ---------- */
  useEffect(() => {
    if (cartCount > 0 && cartSinceRef.current === null) cartSinceRef.current = Date.now();
    if (cartCount === 0) cartSinceRef.current = null;
  }, [cartCount]);

  /* ---------- idle nudge: 45s on a page, once per session ---------- */
  useEffect(() => {
    if (open || nudgedRef.current) return;
    const show = (msg: string) => {
      if (nudgedRef.current) return;
      nudgedRef.current = true;
      try {
        sessionStorage.setItem(NUDGE_KEY, '1');
      } catch {
        /* storage unavailable */
      }
      setTeaser(msg);
    };
    const cartText = () => `Your bag has ${cartCount} crown(s) — want help checking out?`;
    const genericText = "Still browsing, queen? I'm here if you need me 💕";
    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        const age = cartSinceRef.current ? Date.now() - cartSinceRef.current : 0;
        show(cartCount > 0 && age > 60_000 ? cartText() : genericText);
      }, 45_000),
    );
    if (cartCount > 0) {
      const age = Date.now() - (cartSinceRef.current ?? Date.now());
      timers.push(window.setTimeout(() => show(cartText()), Math.max(0, 60_000 - age)));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pathname, cartCount]);

  /* ---------- cleanup ---------- */
  useEffect(
    () => () => {
      if (replyTimerRef.current !== undefined) window.clearTimeout(replyTimerRef.current);
    },
    [],
  );

  /* ---------- send ---------- */
  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || typing || !user) return;
    setInput('');
    setMessages((m) => [...m, { id: nextId(), from: 'user' as const, text, at: Date.now() }].slice(-60));
    setTyping(true);
    replyTimerRef.current = window.setTimeout(
      () => {
        const reply = craftReply(text, {
          userId: user.id,
          userName: user.name,
          tone: prefs?.tone ?? 'genz',
          cartCount,
        });
        setTyping(false);
        setMessages((m) =>
          [
            ...m,
            {
              id: nextId(),
              from: 'ai' as const,
              text: reply.text,
              at: Date.now(),
              ...(reply.link ? { link: reply.link } : {}),
            },
          ].slice(-60),
        );
      },
      reduced ? 60 : 650 + Math.random() * 300,
    );
  };

  const openPanel = () => {
    setTeaser(null);
    setOpen(true);
  };

  const openSetup = () => {
    setDraft(prefs ?? DEFAULT_PREFS);
    setShowSetup(true);
  };

  const saveSetup = () => {
    savePrefs(draft);
    setPrefs(draft);
    setShowSetup(false);
  };

  const msgAnim = reduced ? undefined : 'msgIn 0.4s ease-out';
  const panelTransition = reduced
    ? { duration: 0.12 }
    : { type: 'spring' as const, stiffness: 320, damping: 28 };

  return (
    <>
      {/* FAB (hidden while the panel is open) */}
      {!open && (
        <button
          type="button"
          aria-label="Chat with an AI stylist"
          onClick={openPanel}
          className="fixed z-[445] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_30px_rgba(33,27,22,0.5)] transition-transform hover:scale-110"
          style={{
            bottom: 84,
            right: 'max(16px, calc(50vw - 240px + 16px))',
            background: 'linear-gradient(135deg, #211B16, #151110)',
          }}
        >
          {!reduced && (
            <span
              aria-hidden="true"
              className="absolute -inset-1.5 -z-10 rounded-full opacity-50"
              style={{
                background: 'linear-gradient(135deg, #E3D5BC, #211B16)',
                animation: 'ripple 2s infinite',
              }}
            />
          )}
          <Icon name="chat_bubble" size={1.4} />
          {teaser && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gold text-[0.6rem] font-bold text-berry"
              style={reduced ? undefined : { animation: 'ncBounce 1.5s infinite' }}
            >
              1
            </span>
          )}
        </button>
      )}

      {/* Idle-nudge teaser bubble */}
      <AnimatePresence>
        {!open && teaser && (
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 12, scale: reduced ? 1 : 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduced ? 0 : 12, scale: reduced ? 1 : 0.9 }}
            transition={panelTransition}
            className="fixed z-[450] w-[240px] rounded-2xl rounded-br-sm border border-rose-petal/60 bg-white p-3 shadow-float"
            style={{ bottom: 150, right: 'max(16px, calc(50vw - 240px + 16px))' }}
          >
            <button
              type="button"
              onClick={openPanel}
              className="block w-full text-left text-[0.8rem] leading-snug text-charcoal"
            >
              {teaser}
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setTeaser(null)}
              className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-berry text-white shadow"
            >
              <Icon name="close" size={0.8} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 20, scale: reduced ? 1 : 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduced ? 0 : 20, scale: reduced ? 1 : 0.95 }}
            transition={panelTransition}
            role="dialog"
            aria-label="AI Concierge"
            className="fixed z-[455] flex max-h-[min(72dvh,580px)] w-[calc(100vw-24px)] max-w-[360px] flex-col overflow-hidden rounded-[24px] border border-rose-petal/50 bg-white shadow-float"
            style={{ bottom: 84, right: 'max(12px, calc(50vw - 240px + 12px))' }}
          >
            {/* Header: berry→rose-deep gradient + gold underline strip */}
            <div className="relative flex shrink-0 items-center gap-3 bg-gradient-to-br from-berry to-rose-deep px-4 py-3.5 text-white">
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-petal via-gold to-rose-petal" />
              {view === 'chat' ? (
                <>
                  <div
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold text-white shadow"
                    style={{ background: `linear-gradient(135deg, ${responder.color}, #151110)` }}
                  >
                    {responder.initials}
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-berry bg-online" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {responder.name} <span className="font-normal opacity-75">· {responder.role}</span>
                    </p>
                    <p className="text-xs opacity-90">{typing ? 'typing…' : 'Online now'}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Chat preferences"
                    onClick={openSetup}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
                  >
                    <Icon name="settings" size={1.05} />
                  </button>
                </>
              ) : (
                <>
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blush to-rose-petal font-bold text-berry shadow">
                    NC
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-berry bg-online" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">NaumiCrowns Concierge</p>
                    <p className="text-xs opacity-90">Online now</p>
                  </div>
                </>
              )}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
              >
                <Icon name="close" size={1.1} />
              </button>
            </div>

            {/* ===== GUEST — login gate ===== */}
            {view === 'guest' && (
              <div className="bg-gradient-to-b from-porcelain to-blush p-5 text-center">
                <div
                  className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-white"
                  style={{ background: 'linear-gradient(135deg, #211B16, #7A6B59)' }}
                >
                  <Icon name="chat_bubble" size={1.5} />
                </div>
                <p className="font-display text-lg font-bold text-berry">Chat with our AI stylists</p>
                <p className="mt-1.5 text-[0.82rem] leading-relaxed text-charcoal">
                  Sign in and our stylists will help you pick your crown, track your order and answer
                  everything in between — in your language.
                </p>
                <Link
                  to="/login"
                  onClick={() => {
                    try {
                      sessionStorage.setItem('nc_after_login', pathname);
                    } catch {
                      /* storage unavailable */
                    }
                    setOpen(false);
                  }}
                  className="btn-primary mt-4 w-full"
                >
                  <Icon name="login" size={1.05} />
                  Sign In to Chat
                </Link>
                <a
                  href={SITE.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-berry underline underline-offset-2"
                >
                  <Icon name="chat" size={0.95} />
                  Or WhatsApp a human queen
                </a>
              </div>
            )}

            {/* ===== SETUP — first-open preferences ===== */}
            {view === 'setup' && (
              <motion.div
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                transition={panelTransition}
                className="space-y-3 overflow-y-auto bg-gradient-to-b from-porcelain to-blush p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                    style={{
                      background: 'linear-gradient(135deg, #D4AF37, #211B16)',
                      animation: reduced ? undefined : 'spin 6s linear infinite',
                    }}
                  >
                    <Icon name="auto_awesome" size={1} />
                  </span>
                  <p className="text-sm font-bold text-berry">Set up your chat experience</p>
                </div>
                <label className="block">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wide text-rose-deep">
                    Language
                  </span>
                  <select
                    value={draft.language}
                    onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value as Language }))}
                    className="mt-1 w-full rounded-xl border border-rose-petal/60 bg-white px-3 py-2.5 text-[0.82rem] text-charcoal outline-none focus:border-berry"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wide text-rose-deep">
                    Tone
                  </span>
                  <select
                    value={draft.tone}
                    onChange={(e) => setDraft((d) => ({ ...d, tone: e.target.value as Tone }))}
                    className="mt-1 w-full rounded-xl border border-rose-petal/60 bg-white px-3 py-2.5 text-[0.82rem] text-charcoal outline-none focus:border-berry"
                  >
                    <option value="genz">Friendly Gen-Z</option>
                    <option value="formal">Formal</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={saveSetup}
                  className="btn-primary w-full"
                >
                  Start Chatting
                </button>
              </motion.div>
            )}

            {/* ===== CHAT ===== */}
            {view === 'chat' && (
              <>
                <div
                  ref={scrollRef}
                  className="min-h-[200px] flex-1 space-y-2.5 overflow-y-auto bg-gradient-to-b from-porcelain to-blush px-3 py-3"
                >
                  {messages.map((m) => (
                    <div key={m.id} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      <div
                        className={
                          m.from === 'user'
                            ? 'max-w-[82%] rounded-2xl rounded-br-[4px] px-3.5 py-2.5 text-[0.82rem] leading-relaxed text-white shadow-soft'
                            : 'max-w-[82%] rounded-2xl rounded-bl-[4px] bg-white px-3.5 py-2.5 text-[0.82rem] leading-relaxed text-charcoal shadow-soft'
                        }
                        style={{
                          ...(m.from === 'user'
                            ? { background: 'linear-gradient(135deg, #E3D5BC, #A9812F)', color: '#3B332B' }
                            : {}),
                          animation: msgAnim,
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {m.text}
                        {m.link &&
                          (m.link.external ? (
                            <a
                              href={m.link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 rounded-full bg-blush px-3 py-1 text-xs font-semibold text-berry"
                            >
                              {m.link.label}
                              <Icon name="arrow_outward" size={0.85} />
                            </a>
                          ) : (
                            <Link
                              to={m.link.href}
                              onClick={() => setOpen(false)}
                              className="mt-2 inline-flex items-center gap-1 rounded-full bg-blush px-3 py-1 text-xs font-semibold text-berry"
                            >
                              {m.link.label}
                              <Icon name="arrow_forward" size={0.85} />
                            </Link>
                          ))}
                      </div>
                    </div>
                  ))}
                  {typing && (
                    <div className="flex justify-start">
                      <div className="flex gap-1.5 rounded-2xl rounded-bl-[4px] bg-white px-4 py-3 shadow-soft">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-rose-deep"
                            style={{ animation: `typingDot 1.2s ${i * 0.15}s infinite` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* quick-prompt chips (fresh chats) */}
                {messages.length < 3 && !typing && (
                  <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-rose-petal/40 bg-porcelain/80 px-3 py-2">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => send(q)}
                        className="whitespace-nowrap rounded-full border border-rose-petal bg-white px-3 py-1.5 text-xs font-medium text-berry transition-colors hover:bg-blush"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* input */}
                <div className="flex shrink-0 items-center gap-2 border-t border-rose-petal/40 bg-white/70 p-2.5">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                    placeholder={`Message ${responder.name.split(' ')[0]}…`}
                    maxLength={500}
                    className="flex-1 rounded-full border border-rose-petal/60 bg-white px-3.5 py-2.5 text-[0.82rem] text-charcoal outline-none focus:border-berry"
                  />
                  <button
                    type="button"
                    onClick={() => send(input)}
                    disabled={!input.trim() || typing}
                    aria-label="Send"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #211B16, #151110)' }}
                  >
                    <Icon name="send" size={1} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
