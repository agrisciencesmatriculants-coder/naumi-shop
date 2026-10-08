import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion, animate, useReducedMotion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { attachProofOfPayment, formatDateTime, useOrders } from '@/lib/backend';
import type { Order, OrderStatus } from '@/lib/backend';
import { COURIERS, formatPrice } from '@/lib/catalog';
import Icon from '@/components/Icon';
import StatusChip from '@/components/StatusChip';
import { CrownGlyph } from '@/components/CrownLogo';
import FocusHeader from '@/components/checkout/FocusHeader';
import BankDetailsCard from '@/components/checkout/BankDetailsCard';
import ProofUpload from '@/components/checkout/ProofUpload';
import TrustStrip from '@/components/checkout/TrustStrip';

/** Map backend status ids onto the shared StatusChip ids. */
function chipStatus(s: OrderStatus): 'received' | 'payment_confirmed' | 'workshop_check' | 'crafting' | 'shipped' | 'delivered' | 'cancelled' {
  return s === 'order_received' ? 'received' : s;
}

/** Animated amount that counts up to the order total on load. */
function CountUpAmount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <p className="font-display text-[2rem] font-bold leading-tight text-berry">
      {formatPrice(display)}
    </p>
  );
}

/** Pending state for "we request it from you" — phone with radiating rings. */
function RequestPending({
  order,
  onPaid,
}: {
  order: Order;
  onPaid: () => void;
}) {
  const reduced = useReducedMotion();
  const target = order.paymentRef || 'your phone';

  return (
    <section className="rounded-[20px] border border-blush bg-white p-5 text-center shadow-soft">
      <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
        {!reduced && (
          <>
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-berry"
              animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-rose-mid"
              animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
            />
          </>
        )}
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_8px_25px_rgba(33,27,22,0.35)]"
          style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
        >
          <Icon name="send_to_mobile" size={1.6} />
        </span>
      </div>
      <h2 className="font-display text-xl font-bold text-berry">
        We've sent a payment request to {target}
      </h2>
      <p className="mx-auto mt-2 max-w-[320px] text-sm leading-relaxed text-charcoal/80">
        Open your banking app and approve the {formatPrice(order.total)} request — no rush,
        it usually takes under a minute. Once you approve, our team confirms it on our side and
        your crown moves into the workshop.
      </p>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[0.72rem] text-rose-deep">
        <Icon name="schedule" size={0.9} />
        Waiting for approval… you can follow it live on the tracker.
      </p>
      <motion.button
        type="button"
        whileTap={reduced ? undefined : { scale: 0.97 }}
        onClick={onPaid}
        className="btn-primary mt-4 w-full min-h-[48px]"
      >
        <Icon name="check_circle" size={1.05} />
        I've paid
      </motion.button>
    </section>
  );
}

/** "Proof received — confirming with the bank" state (payment.md §4). */
function ProofPending() {
  const reduced = useReducedMotion();
  return (
    <section className="rounded-[20px] border border-blush bg-white p-5 text-center shadow-soft">
      <motion.span
        animate={reduced ? undefined : { rotate: [-10, 10, -10] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gold-soft text-[#8a6d00]"
      >
        <Icon name="hourglass_top" size={1.6} />
      </motion.span>
      <h2 className="font-display text-xl font-bold text-berry">
        Proof received — confirming with the bank
      </h2>
      <p className="mx-auto mt-2 max-w-[320px] text-sm leading-relaxed text-charcoal/80">
        Our team (and Dr. Tech) verify payments during business hours. You'll get a WhatsApp/email
        the moment it's confirmed — and your tracker updates live.
      </p>
    </section>
  );
}

export default function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const orders = useOrders();
  const reduced = useReducedMotion();

  const order = orders.find((o) => o.id === orderId) ?? null;

  const [proof, setProof] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const paid = !!order && order.status !== 'order_received' && order.status !== 'cancelled';

  // Once the team confirms payment, celebrate briefly and hand off.
  useEffect(() => {
    if (!paid || !order) return;
    const t = window.setTimeout(() => navigate(`/thank-you/${order.id}`), 1800);
    return () => window.clearTimeout(t);
  }, [paid, order, navigate]);

  const submitProof = () => {
    if (!order || !proof || submitting) return;
    setSubmitting(true);
    try {
      attachProofOfPayment(order.id, proof.dataUrl);
      showToast('Proof submitted — our team will confirm your payment.', 'success');
      navigate(`/thank-you/${order.id}`);
    } catch (err) {
      setSubmitting(false);
      showToast(err instanceof Error ? err.message : 'Upload failed — please try again.', 'error');
    }
  };

  const markPaid = () => {
    if (!order) return;
    showToast('Thank you — our team will confirm your payment.', 'success');
    navigate(`/thank-you/${order.id}`);
  };

  /* ---------- states ---------- */

  if (!order) {
    return (
      <div>
        <FocusHeader title="Payment" backLabel="Back to shop" onBack={() => navigate('/')} />
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4 px-6 py-16 text-center"
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_8px_25px_rgba(33,27,22,0.35)]"
            style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
          >
            <Icon name="link_off" size={1.7} />
          </span>
          <h1 className="font-display text-2xl font-bold text-berry">This payment link has expired</h1>
          <p className="max-w-[300px] text-sm text-rose-deep">
            We couldn't find that order on this device. Check your tracker or start a new order.
          </p>
          <Link to="/" className="btn-primary">
            Back to Shop
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <FocusHeader title="Payment" backLabel="Back to shop" onBack={() => navigate('/')} />

      <div className="space-y-4 px-4 pt-4">
        {/* ============ Order header card (payment.md §1) ============ */}
        <motion.section
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[20px] border border-blush bg-white p-4 shadow-soft"
        >
          <div
            className="absolute left-0 right-0 top-0 h-1"
            style={{ background: 'linear-gradient(90deg, #E3D5BC, #211B16, #D4AF37)' }}
          />
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-[0_4px_15px_rgba(33,27,22,0.4)]"
              style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
            >
              <CrownGlyph size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold text-berry">{order.id}</p>
              <p className="text-[0.68rem] text-rose-deep">{formatDateTime(order.createdAt)}</p>
            </div>
            <motion.span
              animate={reduced ? undefined : { scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <StatusChip status={chipStatus(order.status)} />
            </motion.span>
          </div>

          <div className="mt-3 text-center">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[1.5px] text-rose-mid">
              Amount due
            </p>
            <CountUpAmount value={order.total} />
            <p className="text-[0.72rem] text-rose-deep">
              Includes {COURIERS[order.courier].name} delivery
              {order.deliveryFee === 0 ? ' (FREE over R2500)' : ''} · Price locked
            </p>
          </div>

          <ul className="mt-3 space-y-1 border-t border-blush pt-3">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between text-[0.8rem] text-charcoal/80">
                <span className="truncate">
                  {i.name} <span className="text-rose-deep">× {i.qty}</span>
                </span>
                <span className="shrink-0 font-medium">{formatPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* ============ Confirmed flash ============ */}
        <AnimatePresence>
          {paid && (
            <motion.section
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="rounded-[20px] border border-success/30 bg-success/10 p-5 text-center"
            >
              <motion.span
                initial={reduced ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-success text-white"
              >
                <Icon name="check_circle" size={1.6} />
              </motion.span>
              <h2 className="font-display text-xl font-bold text-success">Payment confirmed!</h2>
              <p className="mt-1 text-sm text-charcoal/80">Taking you to your order celebration…</p>
            </motion.section>
          )}
        </AnimatePresence>

        {!paid && order.status === 'cancelled' && (
          <section className="rounded-[20px] border border-plum/30 bg-white p-5 text-center shadow-soft">
            <h2 className="font-display text-xl font-bold text-plum">This order was cancelled</h2>
            <p className="mt-1 text-sm text-rose-deep">Start a fresh order whenever you're ready.</p>
            <Link to="/" className="btn-primary mt-4">
              Back to Shop
            </Link>
          </section>
        )}

        {/* ============ Payment panels by mode ============ */}
        {!paid && order.status !== 'cancelled' && (
          <>
            {order.paymentMode === 'request' ? (
              <RequestPending order={order} onPaid={markPaid} />
            ) : order.proofOfPayment ? (
              <ProofPending />
            ) : (
              <motion.section
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: reduced ? 0 : 0.1 }}
                className="space-y-4"
              >
                <BankDetailsCard reference={order.id} />

                <div className="rounded-[20px] border border-blush bg-white p-4 shadow-soft">
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-[0_4px_15px_rgba(33,27,22,0.35)]"
                      style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
                    >
                      <Icon name="upload_file" size={1.15} />
                    </span>
                    <div>
                      <h2 className="font-display text-[1.1rem] font-semibold text-charcoal">
                        Upload proof of payment
                      </h2>
                      <p className="text-[0.7rem] text-rose-deep">
                        A screenshot or photo from your banking app.
                      </p>
                    </div>
                  </div>
                  <ProofUpload
                    dataUrl={proof?.dataUrl ?? null}
                    fileName={proof?.fileName ?? null}
                    onSelect={(dataUrl, fileName) => setProof({ dataUrl, fileName })}
                    onClear={() => setProof(null)}
                  />
                  <motion.button
                    type="button"
                    whileTap={reduced ? undefined : { scale: 0.97 }}
                    onClick={submitProof}
                    disabled={!proof || submitting}
                    className="btn-primary mt-4 w-full min-h-[48px] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:scale-100"
                  >
                    {submitting ? (
                      <>
                        <Icon name="progress_activity" size={1.05} className="animate-[spin_1s_linear_infinite]" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Icon name="task_alt" size={1.05} />
                        Submit Proof of Payment
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.section>
            )}

            {/* Pay later */}
            <div className="rounded-2xl border border-blush bg-white/70 p-3.5 text-center backdrop-blur-sm">
              <Link
                to={`/track/${order.id}`}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-berry underline underline-offset-4"
              >
                <Icon name="local_shipping" size={1} />
                Pay later — track my order
              </Link>
              <p className="mt-1 text-[0.72rem] leading-relaxed text-rose-deep">
                Orders ship after payment confirmation. Payment is confirmed by the NaumiCrowns
                team — you'll see your live status on the tracker.
              </p>
            </div>
          </>
        )}

        <TrustStrip
          badges={[
            { icon: 'lock', label: '100% Upfront', tone: 'gold' },
            { icon: 'price_check', label: 'Price Locked', tone: 'berry' },
            { icon: 'shield', label: 'Secure & Encrypted', tone: 'success' },
          ]}
          note="We never store banking details. Payment references are matched to your order automatically."
          helpLabel="Payment trouble? Chat with Dr. Tech"
        />
      </div>
    </div>
  );
}
