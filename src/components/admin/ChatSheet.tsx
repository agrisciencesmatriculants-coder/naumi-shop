import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { StaffMember } from '@/lib/office';
import { getThread, isManagerOnDuty, sendOfficeMessage } from '@/lib/office';
import { useApp } from '@/store/AppContext';
import Icon from '@/components/Icon';
import { StaffAvatar } from './chrome';

/** Role-specific suggested prompt chips (office.md §4). */
const PROMPTS: Record<string, string[]> = {
  mgr_tom: ['Team pulse check', 'How is the roster holding up?', 'Any burnout flags?'],
  mgr_shield: ['Any threats this week?', 'Run me through today’s scan log', 'Perimeter status?'],
  mgr_tech: ['Payment match rate?', 'Any site errors today?', 'Outbox health check'],
  mgr_ops: ['How’s the crafting queue?', 'Workshop capacity this week?', 'Any quality issues?'],
  mgr_swift: ['Stock levels this week?', 'Any late parcels?', 'How are Paxi & PostNet performing?'],
  mgr_vogue: ['What should we promote?', 'Top sellers this week?', 'How are the likes looking?'],
};

const STYLIST_PROMPTS = ['How’s the floor today?', 'What are customers asking for?', 'Need help nudging pending orders?'];

const MAX_LEN = 500;

/**
 * Manager chat sheet (office.md §4): full-screen bottom sheet, plum
 * header, business-register chat grammar, suggested prompt chips,
 * 500-char guard, typing indicator.
 */
export default function ManagerChatSheet({
  staff,
  adminEmail,
  onClose,
}: {
  staff: StaffMember | null;
  adminEmail: string;
  onClose: () => void;
}) {
  const { showToast } = useApp();
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState(() => (staff ? getThread(staff.id) : []));
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [hiddenReplyId, setHiddenReplyId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | undefined>(undefined);

  // Reload the thread whenever a different staff member is opened.
  useEffect(() => {
    setMessages(staff ? getThread(staff.id) : []);
    setDraft('');
    setTyping(false);
    setHiddenReplyId(null);
  }, [staff?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => () => window.clearTimeout(typingTimer.current), []);

  const send = (text: string) => {
    if (!staff || typing) return;
    const clean = text.trim();
    if (!clean) return;
    if (clean.length > MAX_LEN) {
      showToast(`Keep it under ${MAX_LEN} characters`, 'error');
      return;
    }
    try {
      const reply = sendOfficeMessage(staff.id, clean, adminEmail);
      setHiddenReplyId(reply.id);
      setTyping(true);
      setDraft('');
      // Reveal the admin line immediately; the staff reply "types" first.
      setMessages(getThread(staff.id));
      typingTimer.current = window.setTimeout(() => {
        setTyping(false);
        setHiddenReplyId(null);
      }, 900);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not send that message', 'error');
    }
  };

  const onDuty = staff ? isManagerOnDuty(staff) : false;
  const visible = hiddenReplyId ? messages.filter((m) => m.id !== hiddenReplyId) : messages;
  const prompts = staff ? (PROMPTS[staff.id] ?? STYLIST_PROMPTS) : [];

  return (
    <AnimatePresence>
      {staff && (
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
            aria-label={`Chat with ${staff.name}`}
            initial={{ y: '100%', x: '-50%' }}
            animate={{ y: 0, x: '-50%' }}
            exit={{ y: '100%', x: '-50%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-1/2 z-[480] flex h-[92dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl bg-porcelain shadow-[0_-20px_50px_rgba(23,18,14,0.4)]"
          >
            {/* Header — plum gradient (office mood) */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 text-white"
              style={{ background: 'linear-gradient(135deg, #17120E, #3B332B)' }}
            >
              <StaffAvatar staff={staff} size={44} online={onDuty} ring={staff.color} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-lg font-bold leading-tight">
                  {staff.name}
                </h2>
                <p className="text-[0.65rem] uppercase tracking-[1.5px] text-rose-petal/90">
                  {staff.title} · {onDuty ? 'On duty now' : 'After hours — replies may be slower'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close chat"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
              >
                <Icon name="close" size={1.1} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
              style={{ background: 'linear-gradient(180deg, #FBF8F1, #F4EEDF)' }}
            >
              {visible.length === 0 && (
                <p className="rounded-2xl bg-white/80 px-4 py-3 text-center text-[0.78rem] text-rose-deep shadow-soft">
                  Say hello — {staff.name.split(' ')[0]} is all yours. Business questions only, bestie.
                </p>
              )}
              {visible.map((m) => (
                <motion.div
                  key={m.id}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className={m.from === 'admin' ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={
                      m.from === 'admin'
                        ? 'max-w-[82%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-[0.8rem] text-white shadow-[0_4px_15px_rgba(33,27,22,0.3)]'
                        : 'max-w-[82%] rounded-2xl rounded-bl-md border border-blush bg-white px-3.5 py-2.5 text-[0.8rem] text-charcoal shadow-soft'
                    }
                    style={
                      m.from === 'admin'
                        ? { background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }
                        : undefined
                    }
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    <p
                      className={
                        m.from === 'admin'
                          ? 'mt-1 text-right text-[0.58rem] text-white/75'
                          : 'mt-1 text-[0.58rem] text-rose-deep/80'
                      }
                    >
                      {new Date(m.at).toLocaleTimeString('en-ZA', {
                        timeZone: 'Africa/Johannesburg',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {m.from === 'admin' ? ' · you' : ` · ${staff.name}`}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator — 3 rose dots */}
              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-blush bg-white px-4 py-3 shadow-soft">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-rose-mid"
                        style={{ animation: `typingDot 1.4s ${i * 0.18}s infinite` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Suggested prompts */}
            <div className="flex gap-1.5 overflow-x-auto border-t border-blush bg-white/80 px-3 py-2">
              {prompts.map((p, i) => (
                <motion.button
                  key={p}
                  type="button"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  onClick={() => send(p)}
                  className="shrink-0 rounded-full bg-blush px-3 py-1.5 text-[0.66rem] font-semibold text-berry transition-colors hover:bg-rose-petal hover:text-white"
                >
                  {p}
                </motion.button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex items-center gap-2 border-t border-blush bg-white px-3 py-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))]"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
                placeholder={`Message ${staff.name}…`}
                maxLength={MAX_LEN}
                aria-label={`Message ${staff.name}`}
                className="min-h-[44px] flex-1 rounded-full border border-rose-petal/60 bg-porcelain px-4 text-sm text-charcoal outline-none transition-colors focus:border-berry focus:ring-2 focus:ring-berry/25"
              />
              <button
                type="submit"
                disabled={!draft.trim() || typing}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-berry to-berry-deep text-white shadow-[0_6px_18px_rgba(33,27,22,0.4)] transition-transform hover:scale-105 disabled:opacity-40"
              >
                <Icon name="send" size={1.05} />
              </button>
            </form>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
