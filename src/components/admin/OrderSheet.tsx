import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Order, OrderStatus } from '@/lib/backend';
import {
  STATUS_LABELS,
  confirmPayment,
  nextStatus,
  updateOrderStatus,
} from '@/lib/backend';
import { COURIERS, formatPrice } from '@/lib/catalog';
import { useApp } from '@/store/AppContext';
import Icon from '@/components/Icon';
import ProductImage from '@/components/ProductImage';
import StatusChip from '@/components/StatusChip';
import { cn } from '@/lib/utils';
import { getAdminNote, setAdminNote } from './chrome';

/** Map backend status to the shared StatusChip vocabulary. */
export function chipStatus(status: OrderStatus) {
  return status === 'order_received' ? ('received' as const) : status;
}

/** SA phone → wa.me link: strip spaces/plus, leading 0 becomes 27. */
export function whatsappHref(phone: string, text: string): string {
  let p = phone.replace(/[\s+()\-]/g, '');
  if (p.startsWith('0')) p = `27${p.slice(1)}`;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

const SHEET_SPRING = { type: 'spring', stiffness: 320, damping: 32 } as const;

/**
 * Order detail bottom sheet (admin.md §3): items, contact deep links,
 * payment block with proof lightbox + confirm, stage advance (shipped
 * requires courier + tracking ref), cancel with inline confirm, and an
 * admins-only internal note.
 */
export default function OrderSheet({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  const { showToast } = useApp();
  const [lightbox, setLightbox] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [trackingRef, setTrackingRef] = useState('');
  const [shipError, setShipError] = useState('');
  const [note, setNote] = useState('');

  // Reset per-order local state when a different order is opened.
  useEffect(() => {
    setLightbox(false);
    setConfirmCancel(false);
    setTrackingRef('');
    setShipError('');
    setNote(order ? getAdminNote(order.id) : '');
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (order) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  const next = order ? nextStatus(order.status) : null;

  const advance = () => {
    if (!order || !next) return;
    if (next === 'shipped') {
      const ref = trackingRef.trim();
      if (!ref) {
        setShipError('Tracking reference is required before marking as shipped.');
        return;
      }
      updateOrderStatus(order.id, 'shipped', `${COURIERS[order.courier].name} tracking ref: ${ref}`);
    } else {
      updateOrderStatus(order.id, next);
    }
    showToast(`${order.id} → ${STATUS_LABELS[next]}`);
    setTrackingRef('');
    setShipError('');
  };

  const cancel = () => {
    if (!order) return;
    updateOrderStatus(order.id, 'cancelled', 'Cancelled by admin');
    showToast(`${order.id} cancelled`, 'info');
    setConfirmCancel(false);
  };

  const confirmPay = () => {
    if (!order) return;
    confirmPayment(order.id);
    showToast(`${order.id} → Payment Confirmed`);
  };

  const saveNote = () => {
    if (!order) return;
    setAdminNote(order.id, note);
    showToast('Internal note saved');
  };

  return (
    <AnimatePresence>
      {order && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-[470] bg-charcoal/50 backdrop-blur-sm"
          />
          <motion.section
            role="dialog"
            aria-label={`Order ${order.id} details`}
            initial={{ y: '100%', x: '-50%' }}
            animate={{ y: 0, x: '-50%' }}
            exit={{ y: '100%', x: '-50%' }}
            transition={SHEET_SPRING}
            className="fixed bottom-0 left-1/2 z-[480] flex max-h-[88dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-20px_50px_rgba(33,27,22,0.25)]"
          >
            {/* Grab handle + header */}
            <div className="border-b border-blush px-5 pb-3 pt-2.5">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-blush" />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold text-berry">{order.id}</h2>
                  <p className="text-[0.72rem] text-rose-deep">
                    {order.contact.name} · {order.city} · {timeLabel(order.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={chipStatus(order.status)} />
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close order details"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-blush text-berry transition-colors hover:bg-rose-petal hover:text-white"
                  >
                    <Icon name="close" size={1.1} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {/* Items */}
              <section>
                <SectionLabel icon="shopping_bag" label="Items" />
                <ul className="space-y-2.5">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <ProductImage
                        src={item.image}
                        alt={item.name}
                        width={96}
                        height={96}
                        className="h-12 w-12 rounded-xl border border-blush object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-charcoal">{item.name}</p>
                        <p className="text-[0.72rem] text-rose-deep">
                          x{item.qty} · {formatPrice(item.price)} each
                        </p>
                      </div>
                      <span className="font-display text-sm font-bold text-berry">
                        {formatPrice(item.price * item.qty)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-1 border-t border-blush pt-2.5 text-[0.78rem]">
                  <Row label="Subtotal" value={formatPrice(order.subtotal)} />
                  <Row
                    label={`Delivery (${COURIERS[order.courier].name})`}
                    value={order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee)}
                  />
                  <Row label="Total" value={formatPrice(order.total)} strong />
                </div>
              </section>

              {/* Customer contact */}
              <section>
                <SectionLabel icon="person" label="Customer" />
                <div className="rounded-2xl border border-blush bg-porcelain p-3 text-[0.8rem]">
                  <p className="font-semibold text-charcoal">{order.contact.name}</p>
                  <p className="text-rose-deep">{order.contact.email}</p>
                  <p className="text-rose-deep">{order.contact.phone}</p>
                  <p className="mt-1 text-rose-deep">
                    {order.deliveryPoint} — {order.city}
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <a
                      href={`tel:${order.contact.phone.replace(/[\s()\-]/g, '')}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-berry/40 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[1px] text-berry transition-colors hover:bg-blush"
                    >
                      <Icon name="call" size={0.9} /> Call
                    </a>
                    <a
                      href={whatsappHref(
                        order.contact.phone,
                        `Hi ${order.contact.name}, this is NaumiCrowns about your order ${order.id}.`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[1px] text-white transition-transform hover:-translate-y-0.5"
                    >
                      <Icon name="chat" size={0.9} /> WhatsApp
                    </a>
                  </div>
                </div>
              </section>

              {/* Payment block */}
              <section>
                <SectionLabel icon="payments" label="Payment" />
                <div className="rounded-2xl border border-blush bg-porcelain p-3 text-[0.8rem]">
                  <Row
                    label="Method"
                    value={
                      order.paymentMethod === 'payshap' ? 'PayShap' : 'Capitec cellphone pay'
                    }
                  />
                  <Row
                    label="Flow"
                    value={
                      order.paymentMode === 'request'
                        ? `We requested it${order.paymentRef ? ` (${order.paymentRef})` : ''}`
                        : 'Customer sends + uploads proof'
                    }
                  />
                  {order.proofOfPayment && (
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setLightbox(true)}
                        aria-label="Zoom proof of payment"
                        className="group relative shrink-0"
                      >
                        <img
                          src={order.proofOfPayment}
                          alt="Proof of payment"
                          className="h-16 w-16 rounded-xl border border-rose-petal/60 object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-plum/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <Icon name="zoom_in" size={1.1} />
                        </span>
                      </button>
                      <p className="text-[0.72rem] text-rose-deep">
                        Proof of payment uploaded — tap to zoom, then confirm below if it matches{' '}
                        <span className="font-semibold text-charcoal">{formatPrice(order.total)}</span>.
                      </p>
                    </div>
                  )}
                  {order.status === 'order_received' && (
                    <button
                      type="button"
                      onClick={confirmPay}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-success py-3 text-[0.75rem] font-semibold uppercase tracking-[1.5px] text-white shadow-[0_8px_20px_rgba(45,134,89,0.35)] transition-transform hover:-translate-y-0.5"
                    >
                      <Icon name="check_circle" size={1} /> Confirm Payment
                    </button>
                  )}
                </div>
              </section>

              {/* Stage advance */}
              {order.status !== 'cancelled' && next && (
                <section>
                  <SectionLabel icon="moves" label="Next Stage" />
                  {next === 'shipped' && (
                    <div className="mb-3 space-y-2 rounded-2xl border border-gold/40 bg-gold-soft/40 p-3">
                      <Row label="Courier" value={COURIERS[order.courier].name} />
                      <label className="block">
                        <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[1px] text-[#8a6d00]">
                          Tracking reference (required)
                        </span>
                        <input
                          type="text"
                          value={trackingRef}
                          onChange={(e) => {
                            setTrackingRef(e.target.value);
                            setShipError('');
                          }}
                          placeholder="e.g. PAX123456789"
                          className="w-full rounded-xl border border-gold/50 bg-white px-3.5 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-berry focus:ring-2 focus:ring-berry/25"
                        />
                      </label>
                      {shipError && (
                        <p role="alert" className="text-[0.72rem] font-medium text-berry-deep">
                          {shipError}
                        </p>
                      )}
                    </div>
                  )}
                  <motion.button
                    type="button"
                    onClick={advance}
                    whileTap={{ scale: 0.97 }}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-berry to-berry-deep py-3.5 text-[0.78rem] font-semibold uppercase tracking-[1.5px] text-white shadow-[0_8px_25px_rgba(33,27,22,0.35)] transition-transform hover:-translate-y-0.5"
                  >
                    <Icon name="arrow_forward" size={1} /> Move to {STATUS_LABELS[next]}
                  </motion.button>
                  <p className="mt-1.5 text-center text-[0.68rem] text-rose-deep">
                    The customer tracker updates instantly and they are emailed right away.
                  </p>
                </section>
              )}

              {/* Internal note (admins only) */}
              <section>
                <SectionLabel icon="sticky_note_2" label="Internal Note · admins only" />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Only George & Naumi see this…"
                  className="w-full resize-none rounded-xl border border-rose-petal/60 bg-white px-3.5 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-berry focus:ring-2 focus:ring-berry/25"
                />
                <button
                  type="button"
                  onClick={saveNote}
                  className="mt-1.5 rounded-full border border-berry/40 px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[1px] text-berry transition-colors hover:bg-blush"
                >
                  Save note
                </button>
              </section>

              {/* Status history */}
              <section>
                <SectionLabel icon="timeline" label="History" />
                <ul className="space-y-1.5">
                  {[...order.statusHistory].reverse().map((entry, i) => (
                    <li key={`${entry.status}-${entry.at}`} className="flex items-start gap-2 text-[0.75rem]">
                      <span
                        className={cn(
                          'mt-1 h-2 w-2 shrink-0 rounded-full',
                          i === 0 ? 'bg-berry' : 'bg-rose-petal',
                        )}
                      />
                      <span className="text-charcoal">
                        <span className="font-semibold">{STATUS_LABELS[entry.status]}</span>
                        <span className="text-rose-deep"> · {timeLabel(entry.at)}</span>
                        {entry.note && <span className="block text-rose-deep">{entry.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Cancel */}
              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <section className="pb-2">
                  {confirmCancel ? (
                    <div className="rounded-2xl border border-plum/30 bg-porcelain p-3 text-center">
                      <p className="mb-2.5 text-[0.8rem] font-semibold text-plum">
                        Cancel {order.id}? The customer is emailed immediately.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancel}
                          className="flex-1 rounded-full bg-plum py-2.5 text-[0.72rem] font-semibold uppercase tracking-[1px] text-white"
                        >
                          Yes, cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmCancel(false)}
                          className="flex-1 rounded-full border border-plum/40 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[1px] text-plum"
                        >
                          Keep order
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-plum/60 py-3 text-[0.72rem] font-semibold uppercase tracking-[1.5px] text-plum transition-colors hover:bg-plum hover:text-white"
                    >
                      <Icon name="cancel" size={0.95} /> Cancel Order
                    </button>
                  )}
                </section>
              )}
            </div>
          </motion.section>

          {/* Proof-of-payment lightbox */}
          <AnimatePresence>
            {lightbox && order.proofOfPayment && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setLightbox(false)}
                className="fixed inset-0 z-[500] flex items-center justify-center bg-plum/85 p-6 backdrop-blur-sm"
                role="dialog"
                aria-label="Proof of payment, zoomed"
              >
                <motion.img
                  initial={{ scale: 0.92 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  src={order.proofOfPayment}
                  alt="Proof of payment, zoomed"
                  className="max-h-[80dvh] max-w-full rounded-2xl border-2 border-gold/50 object-contain"
                />
                <button
                  type="button"
                  onClick={() => setLightbox(false)}
                  aria-label="Close proof preview"
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
                >
                  <Icon name="close" size={1.2} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[1.5px] text-rose-deep">
      <Icon name={icon} size={0.9} className="text-berry" />
      {label}
    </h3>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-rose-deep">{label}</span>
      <span
        className={cn(
          'text-right',
          strong ? 'font-display text-base font-bold text-berry' : 'font-medium text-charcoal',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function timeLabel(ts: number): string {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}
