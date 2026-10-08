import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import Icon from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import {
  isPasswordStrong,
  signIn,
  signUp,
  useCurrentUser,
} from '@/lib/backend';

type Mode = 'signin' | 'signup';

/** After auth, honour the stashed return path (checkout gate sets it). */
function consumeReturnPath(): string {
  const p = sessionStorage.getItem('nc_after_login');
  sessionStorage.removeItem('nc_after_login');
  return p && p.startsWith('/') ? p : '/account';
}

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const user = useCurrentUser();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');

  // Already signed in? Leave.
  useEffect(() => {
    if (user) navigate(consumeReturnPath(), { replace: true });
  }, [user, navigate]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const u = signUp(name, email, password, phone || undefined);
        showToast(`Welcome to NaumiCrowns, ${u.name.split(' ')[0]}!`, 'success');
        // Surface the one-time recovery code so the customer can save it.
        setRecoveryCode((u as { recoveryCode?: string }).recoveryCode ?? '');
      } else {
        const u = signIn(email, password);
        showToast(`Welcome back, ${u.name.split(' ')[0]}!`, 'success');
      }
      // Navigation happens via the useEffect above once auth state lands.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  }

  const pwHint =
    mode === 'signup' && password.length > 0 && !isPasswordStrong(password)
      ? 'Needs 8+ characters with upper & lower case letters and a number.'
      : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="px-5 pb-16 pt-10"
    >
      {/* Brand mark */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-pink"
          style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
        >
          <Icon name="crown" size={1.8} />
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold text-berry">
          {mode === 'signin' ? 'Welcome back' : 'Join NaumiCrowns'}
        </h1>
        <p className="script mt-1 text-lg text-rose-mid">every crown tells a story</p>
      </div>

      {/* Mode tabs */}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-blush p-1">
        {(['signin', 'signup'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError('');
            }}
            className={`rounded-full py-2.5 text-xs font-semibold uppercase tracking-[1.5px] transition-all ${
              mode === m
                ? 'bg-gradient-to-br from-berry to-berry-deep text-white shadow-pink'
                : 'text-berry'
            }`}
          >
            {m === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode === 'signup' && (
          <label className="block">
            <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-rose-deep">
              Your name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Naumi Crown"
              autoComplete="name"
              className="w-full rounded-xl border border-blush bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-mid focus:ring-2 focus:ring-rose-petal/40"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-rose-deep">
            Email address
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-xl border border-blush bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-mid focus:ring-2 focus:ring-rose-petal/40"
          />
        </label>

        {mode === 'signup' && (
          <label className="block">
            <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-rose-deep">
              WhatsApp / phone <span className="font-normal normal-case tracking-normal">(optional)</span>
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27 79 000 0000"
              autoComplete="tel"
              className="w-full rounded-xl border border-blush bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-mid focus:ring-2 focus:ring-rose-petal/40"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-rose-deep">
            Password
          </span>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-blush bg-white px-4 py-3 pr-12 text-sm text-charcoal outline-none transition focus:border-rose-mid focus:ring-2 focus:ring-rose-petal/40"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-rose-deep"
            >
              <Icon name={showPw ? 'visibility_off' : 'visibility'} size={1.2} />
            </button>
          </div>
          {pwHint && <span className="mt-1 block text-[0.7rem] text-rose-deep">{pwHint}</span>}
        </label>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gold bg-gold-soft/40 px-4 py-3 text-xs font-medium text-berry-deep"
            role="alert"
          >
            {error}
          </motion.p>
        )}

        <motion.button
          type="submit"
          disabled={busy}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="mt-2 rounded-full bg-gradient-to-br from-berry to-berry-deep py-3.5 text-xs font-semibold uppercase tracking-[1.5px] text-white shadow-pink disabled:opacity-60"
        >
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign In' : 'Create My Account'}
        </motion.button>
      </form>

      {recoveryCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-5 rounded-2xl border border-gold bg-gold-soft/40 p-4 text-center"
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-berry-deep">
            Save your recovery code
          </p>
          <p className="mt-1 font-display text-2xl font-bold tracking-[3px] text-berry">
            {recoveryCode}
          </p>
          <p className="mt-1 text-[0.7rem] text-rose-deep">
            You will need this code if you ever forget your password.
          </p>
        </motion.div>
      )}

      <p className="mt-6 text-center text-[0.72rem] leading-relaxed text-rose-deep">
        Guests can browse, like and fill their bag — you only need an account at checkout,
        so your orders and live tracking stay linked to you.
      </p>
    </motion.div>
  );
}
