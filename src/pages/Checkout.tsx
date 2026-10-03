import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { DELIVERY_CITIES, createOrder, getSettings, useCurrentUser } from '@/lib/backend';
import type { DeliveryCity } from '@/lib/backend';
import { COURIERS, FREE_DELIVERY_THRESHOLD, formatPrice } from '@/lib/catalog';
import Icon from '@/components/Icon';
import { Switch } from '@/components/ui/switch';
import FocusHeader from '@/components/checkout/FocusHeader';
import OrderSummaryCard from '@/components/checkout/OrderSummaryCard';
import TrustStrip from '@/components/checkout/TrustStrip';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;
type CourierId = 'paxi' | 'postnet';
type PaymentMethod = 'payshap' | 'capitec';
type PaymentMode = 'request' | 'send';

const STEP_LABELS = ['Details', 'Delivery', 'Payment'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** SA numbers: 0XXXXXXXXX, 27XXXXXXXXX or +27XXXXXXXXX. */
const PHONE_RE = /^(\+27|27|0)\d{9}$/;

function cleanPhone(v: string): string {
  return v.replace(/[\s()-]/g, '');
}

/** Floating-label text field (checkout.md §2). */
function Field({
  label,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  icon,
  hint,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  icon: string;
  hint?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <div className="relative">
        <Icon
          name={icon}
          size={1.05}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-mid"
        />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder=" "
          autoComplete={autoComplete}
          aria-label={label}
          aria-invalid={!!error}
          className={cn(
            'peer min-h-[52px] w-full rounded-xl border bg-white pb-1.5 pl-10 pr-4 pt-5 text-sm text-charcoal outline-none transition-colors focus:ring-2',
            error
              ? 'border-berry-deep focus:border-berry-deep focus:ring-berry-deep/25'
              : 'border-rose-petal/60 focus:border-berry focus:ring-berry/25',
          )}
        />
        <span
          className={cn(
            'pointer-events-none absolute left-10 transition-all',
            'top-1/2 -translate-y-1/2 text-sm text-rose-deep',
            'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[0.65rem] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-[1px] peer-focus:text-berry',
            'peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[0.65rem] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[1px]',
          )}
        >
          {label}
        </span>
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-[0.72rem] font-medium text-berry-deep">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[0.7rem] text-rose-deep">{hint}</p>
      ) : null}
    </div>
  );
}

/** Card shell with gradient icon chip + Playfair title (checkout.md §2/§3). */
function StepCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-blush bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-[0_4px_15px_rgba(33,27,22,0.35)]"
          style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
        >
          <Icon name={icon} size={1.15} />
        </span>
        <h2 className="font-display text-[1.2rem] font-semibold text-charcoal">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Checkout() {
  const { cart, cartTotal, clearCart, showToast } = useApp();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState(1);
  const [shake, setShake] = useState(0);
  const [placing, setPlacing] = useState(false);

  // Step 1 — contact
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState(true);
  const prefilledFor = useRef<string | null>(null);

  // Step 2 — delivery
  const [city, setCity] = useState<DeliveryCity | null>(null);
  const [courier, setCourier] = useState<CourierId>('paxi');
  const [deliveryPoint, setDeliveryPoint] = useState('');

  // Step 3 — payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('payshap');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('request');
  const [paymentRef, setPaymentRef] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill contact details from the signed-in profile.
  useEffect(() => {
    if (user && prefilledFor.current !== user.id) {
      prefilledFor.current = user.id;
      setName((v) => v || user.name);
      setEmail((v) => v || user.email);
      setPhone((v) => v || user.phone || '');
    }
  }, [user]);

  // Login gate — stash the return path and hand off to /login.
  useEffect(() => {
    if (user === null) {
      try {
        sessionStorage.setItem('nc_after_login', '/checkout');
      } catch {
        /* storage unavailable */
      }
      showToast('Sign in to complete your order', 'info');
      navigate('/login', { replace: true });
    }
  }, [user, navigate, showToast]);

  const settings = getSettings();
  const freeDelivery = cartTotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = freeDelivery ? 0 : courier === 'paxi' ? settings.paxiFee : settings.postnetFee;
  const total = cartTotal + deliveryFee;

  /* ---------- validation ---------- */

  const validateStep = (s: Step): Record<string, string> => {
    const next: Record<string, string> = {};
    if (s === 1) {
      if (name.trim().length < 2) next.name = 'Please tell us your full name.';
      if (!EMAIL_RE.test(email.trim())) next.email = 'Please enter a valid email address.';
      if (!PHONE_RE.test(cleanPhone(phone)))
        next.phone = 'Enter a valid SA number (10 digits, e.g. 082 123 4567).';
    }
    if (s === 2) {
      if (!city) next.city = 'Please choose your delivery city.';
      if (deliveryPoint.trim().length < 6)
        next.deliveryPoint = 'Tell us the PEP store / PostNet branch + street address.';
    }
    if (s === 3 && paymentMode === 'request') {
      if (paymentMethod === 'capitec') {
        if (!PHONE_RE.test(cleanPhone(paymentRef)))
          next.paymentRef = 'Enter the Capitec cellphone number we should request from.';
      } else if (paymentRef.trim().length < 3) {
        next.paymentRef = 'Enter your PayShap ID (e.g. name@pay.shap).';
      }
    }
    return next;
  };

  const stepValid = (s: Step) => Object.keys(validateStep(s)).length === 0;

  const blurValidate = (key: string, valid: boolean, msg: string) => {
    setErrors((e) => {
      const next = { ...e };
      if (valid) delete next[key];
      else next[key] = msg;
      return next;
    });
  };

  const goTo = (next: Step) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
    setErrors({});
  };

  const handleContinue = () => {
    const errs = validateStep(step);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setShake((n) => n + 1);
      showToast('Please fix the highlighted fields', 'error');
      return;
    }
    if (step < 3) goTo((step + 1) as Step);
    else void placeOrder();
  };

  const placeOrder = () => {
    if (!user || !city || placing) return;
    setPlacing(true);
    try {
      const order = createOrder({
        userId: user.id,
        items: cart.map((i) => ({ id: i.id, qty: i.qty })),
        city,
        courier,
        deliveryPoint,
        contact: { name, email, phone: cleanPhone(phone) },
        paymentMethod,
        paymentMode,
        paymentRef: paymentMode === 'request' ? paymentRef : undefined,
      });
      clearCart();
      showToast(`Order ${order.id} received. Thank you.`, 'success');
      navigate(`/payment/${order.id}`);
    } catch (err) {
      setPlacing(false);
      showToast(err instanceof Error ? err.message : 'Could not place your order — try again.', 'error');
    }
  };

  /* ---------- gates ---------- */

  if (!user) {
    // Fallback gate UI (the effect above redirects to /login immediately).
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_8px_25px_rgba(33,27,22,0.35)]"
          style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
        >
          <Icon name="lock" size={1.8} />
        </span>
        <h1 className="font-display text-2xl font-bold text-berry">Sign in to complete your order</h1>
        <p className="max-w-[300px] text-sm text-rose-deep">Your bag is saved and waiting.</p>
        <Link to="/login" className="btn-primary">
          Sign in to your account
        </Link>
      </div>
    );
  }

  if (cart.length === 0 && !placing) {
    return (
      <div>
        <FocusHeader title="Secure Checkout" backLabel="Back to shop" onBack={() => navigate('/')} />
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4 px-6 py-16 text-center"
        >
          <img src="/empty-bag.svg" alt="" width={180} height={180} className="h-44 w-44" />
          <h2 className="font-display text-2xl font-bold text-berry">Your bag is empty</h2>
          <p className="max-w-[300px] text-sm text-rose-deep">
            Add a crown to your bag before checking out.
          </p>
          <Link to="/" className="btn-primary">
            Back to Shop
            <Icon name="arrow_forward" size={1.05} />
          </Link>
        </motion.div>
      </div>
    );
  }

  /* ---------- page ---------- */

  return (
    <div className="pb-[220px]">
      <FocusHeader
        title="Secure Checkout"
        backLabel={step > 1 ? 'Back a step' : 'Back to shop'}
        onBack={() => (step > 1 ? goTo((step - 1) as Step) : navigate('/'))}
        steps={STEP_LABELS}
        activeStep={step}
      />

      <div className="space-y-4 px-4 pt-4">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 * dir }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24 * dir }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <motion.div
              key={`shake-${shake}`}
              animate={shake > 0 && !reduced ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
              transition={{ duration: 0.4 }}
            >
              {/* ============ STEP 1 — DETAILS ============ */}
              {step === 1 && (
                <StepCard icon="person" title="Who's wearing the crown?">
                  <div className="space-y-3">
                    <Field
                      label="Full name"
                      icon="badge"
                      value={name}
                      onChange={setName}
                      onBlur={() =>
                        name.trim() &&
                        blurValidate('name', name.trim().length >= 2, 'Please tell us your full name.')
                      }
                      error={errors.name}
                      autoComplete="name"
                    />
                    <Field
                      label="Phone number"
                      icon="call"
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      onBlur={() =>
                        phone.trim() &&
                        blurValidate(
                          'phone',
                          PHONE_RE.test(cleanPhone(phone)),
                          'Enter a valid SA number (10 digits, e.g. 082 123 4567).',
                        )
                      }
                      error={errors.phone}
                      hint="SA format: +27 or 0… — we send delivery updates here."
                      autoComplete="tel"
                    />
                    <Field
                      label="Email address"
                      icon="mail"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      onBlur={() =>
                        email.trim() &&
                        blurValidate('email', EMAIL_RE.test(email.trim()), 'Please enter a valid email address.')
                      }
                      error={errors.email}
                      hint="Used for your order confirmation and updates."
                      autoComplete="email"
                    />
                    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-blush bg-porcelain px-3.5 py-2.5">
                      <span className="flex items-center gap-2 text-sm font-medium text-charcoal">
                        <Icon name="chat" size={1} className="text-success" />
                        Send my order updates on WhatsApp
                      </span>
                      <Switch
                        checked={whatsapp}
                        onCheckedChange={setWhatsapp}
                        aria-label="Send order updates on WhatsApp"
                        className="data-[state=checked]:bg-berry data-[state=unchecked]:bg-rose-petal/60"
                      />
                    </label>
                  </div>
                </StepCard>
              )}

              {/* ============ STEP 2 — DELIVERY ============ */}
              {step === 2 && (
                <StepCard icon="local_shipping" title="Where is your crown going?">
                  <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-rose-mid">
                    Delivery city
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {DELIVERY_CITIES.map((c) => {
                      const selected = city === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCity(c);
                            setErrors((e) => {
                              const n = { ...e };
                              delete n.city;
                              return n;
                            });
                          }}
                          aria-pressed={selected}
                          className={cn(
                            'relative flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-3 transition-all',
                            selected
                              ? 'border-berry bg-blush/70 shadow-soft'
                              : 'border-rose-petal/50 bg-white hover:border-rose-petal',
                          )}
                        >
                          {selected && (
                            <motion.span
                              initial={reduced ? false : { scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                              className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-berry text-white shadow"
                            >
                              <Icon name="check" size={0.85} />
                            </motion.span>
                          )}
                          <Icon name="location_on" size={1.4} className={selected ? 'text-berry' : 'text-rose-mid'} />
                          <span className="text-sm font-bold text-charcoal">{c}</span>
                          <span className="text-[0.65rem] text-rose-deep">
                            {c === 'Polokwane' ? 'Limpopo workshop region' : 'Gauteng'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.city ? (
                    <p role="alert" className="mt-1 text-[0.72rem] font-medium text-berry-deep">
                      {errors.city}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[0.72rem] text-rose-deep">
                      We currently deliver to Polokwane and Johannesburg only.
                    </p>
                  )}

                  <p className="mb-2 mt-4 text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-rose-mid">
                    Courier
                  </p>
                  <div className="space-y-2">
                    {(['paxi', 'postnet'] as CourierId[]).map((id) => {
                      const c = COURIERS[id];
                      const selected = courier === id;
                      const fee = id === 'paxi' ? settings.paxiFee : settings.postnetFee;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setCourier(id)}
                          aria-pressed={selected}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition-all',
                            selected
                              ? '-translate-y-0.5 border-berry bg-white shadow-pink'
                              : 'border-rose-petal/50 bg-white hover:border-rose-petal',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                              selected ? 'bg-gradient-to-br from-rose-petal to-berry text-white' : 'bg-blush text-berry',
                            )}
                          >
                            <Icon name={id === 'paxi' ? 'storefront' : 'local_post_office'} size={1.1} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-charcoal">{c.name}</span>
                            <span className="block text-[0.7rem] text-rose-deep">
                              {c.eta} · {c.note}
                            </span>
                          </span>
                          {freeDelivery ? (
                            <span className="shrink-0 rounded-full bg-gold-soft px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[1px] text-[#8a6d00]">
                              FREE <span className="line-through opacity-60">{formatPrice(fee)}</span>
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-blush px-2.5 py-1 text-[0.72rem] font-bold text-berry">
                              {formatPrice(fee)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <Field
                      label="Delivery point / address"
                      icon="home_pin"
                      value={deliveryPoint}
                      onChange={setDeliveryPoint}
                      onBlur={() =>
                        deliveryPoint.trim() &&
                        blurValidate(
                          'deliveryPoint',
                          deliveryPoint.trim().length >= 6,
                          'Tell us the PEP store / PostNet branch + street address.',
                        )
                      }
                      error={errors.deliveryPoint}
                      hint="PEP store name or PostNet branch + street address."
                    />
                  </div>

                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-gold/30 bg-white/70 p-3 backdrop-blur-sm">
                    <Icon name="verified" size={1.1} className="mt-0.5 shrink-0 text-gold" />
                    <p className="text-[0.75rem] leading-relaxed text-charcoal">
                      Delivery takes <strong>2 to 6 business working days</strong>. If it takes more
                      than 6 days, you get <strong>R50 off</strong> your next purchase — guaranteed.
                    </p>
                  </div>
                </StepCard>
              )}

              {/* ============ STEP 3 — PAYMENT ============ */}
              {step === 3 && (
                <StepCard icon="payments" title="How will you pay?">
                  <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-rose-mid">
                    Payment method
                  </p>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-blush/60 p-1.5">
                    {(
                      [
                        { id: 'payshap', label: 'PayShap', icon: 'bolt' },
                        { id: 'capitec', label: 'Capitec cellphone pay', icon: 'smartphone' },
                      ] as { id: PaymentMethod; label: string; icon: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        aria-pressed={paymentMethod === m.id}
                        className={cn(
                          'flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-2 text-[0.78rem] font-semibold transition-all',
                          paymentMethod === m.id
                            ? 'bg-gradient-to-br from-berry to-berry-deep text-white shadow-[0_4px_12px_rgba(33,27,22,0.35)]'
                            : 'bg-white text-berry',
                        )}
                      >
                        <Icon name={m.icon} size={0.95} />
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <p className="mb-2 mt-4 text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-rose-mid">
                    How it happens
                  </p>
                  <div className="space-y-2">
                    {(
                      [
                        {
                          id: 'request',
                          icon: 'send_to_mobile',
                          title: 'We request it from you',
                          sub: `We send a ${
                            paymentMethod === 'payshap' ? 'PayShap' : 'Capitec'
                          } request to your phone — just approve it.`,
                        },
                        {
                          id: 'send',
                          icon: 'upload_file',
                          title: "I'll send it now",
                          sub: 'Pay to our banking details and upload your proof on the next screen.',
                        },
                      ] as { id: PaymentMode; icon: string; title: string; sub: string }[]
                    ).map((m) => {
                      const selected = paymentMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMode(m.id)}
                          aria-pressed={selected}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition-all',
                            selected
                              ? '-translate-y-0.5 border-berry bg-white shadow-pink'
                              : 'border-rose-petal/50 bg-white hover:border-rose-petal',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                              selected ? 'bg-gradient-to-br from-rose-petal to-berry text-white' : 'bg-blush text-berry',
                            )}
                          >
                            <Icon name={m.icon} size={1.1} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-charcoal">{m.title}</span>
                            <span className="block text-[0.7rem] leading-snug text-rose-deep">{m.sub}</span>
                          </span>
                          {selected && (
                            <motion.span
                              initial={reduced ? false : { scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-berry text-white"
                            >
                              <Icon name="check" size={0.85} />
                            </motion.span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {paymentMode === 'request' && (
                    <motion.div
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3"
                    >
                      <Field
                        label={
                          paymentMethod === 'payshap' ? 'Your PayShap ID' : 'Your Capitec cellphone number'
                        }
                        icon={paymentMethod === 'payshap' ? 'alternate_email' : 'smartphone'}
                        type={paymentMethod === 'payshap' ? 'text' : 'tel'}
                        value={paymentRef}
                        onChange={setPaymentRef}
                        error={errors.paymentRef}
                        hint={
                          paymentMethod === 'payshap'
                            ? 'e.g. name@pay.shap'
                            : 'The number linked to your Capitec account.'
                        }
                      />
                    </motion.div>
                  )}
                  {paymentMode === 'send' && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl bg-blush/70 p-3 text-[0.75rem] leading-relaxed text-charcoal">
                      <Icon name="info" size={1} className="mt-0.5 shrink-0 text-berry" />
                      On the next screen you'll see our banking details and can upload your proof of
                      payment.
                    </p>
                  )}
                </StepCard>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <OrderSummaryCard courier={courier} subtotal={cartTotal} deliveryFee={deliveryFee} total={total} />

        <TrustStrip
          badges={[
            { icon: 'lock', label: 'Secure Checkout', tone: 'success' },
            { icon: 'content_cut', label: 'Made In-House', tone: 'berry' },
            { icon: 'verified', label: 'R50 Late-Delivery Promise', tone: 'gold' },
          ]}
          helpLabel="Need help? Chat with Dr. Tech"
        />
      </div>

      {/* ============ Sticky action bar (checkout.md §5) ============ */}
      <div className="fixed bottom-[calc(66px+env(safe-area-inset-bottom,0px))] left-1/2 z-[440] w-full max-w-[480px] -translate-x-1/2 border-t border-blush bg-white/95 px-4 py-3 shadow-[0_-6px_24px_rgba(33,27,22,0.12)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[1px] text-rose-deep">Total</p>
            <motion.p
              key={total}
              initial={reduced ? false : { scale: 1.06 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="truncate font-display text-xl font-bold text-berry"
            >
              {formatPrice(total)}
            </motion.p>
          </div>
          <motion.button
            type="button"
            whileTap={reduced ? undefined : { scale: 0.97 }}
            onClick={handleContinue}
            disabled={placing || !stepValid(step)}
            className="btn-primary min-h-[48px] flex-1 !px-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:scale-100"
          >
            {placing ? (
              <>
                <Icon name="progress_activity" size={1.05} className="animate-[spin_1s_linear_infinite]" />
                Placing order…
              </>
            ) : step < 3 ? (
              <>
                Continue
                <Icon name="arrow_forward" size={1.05} />
              </>
            ) : (
              <>
                Place Order &amp; Pay
                <Icon name="arrow_forward" size={1.05} />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
