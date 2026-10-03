import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCurrentUser, useOrders } from '@/lib/backend';
import type { User } from '@/lib/backend';
import { formatPrice } from '@/lib/catalog';
import {
  MANAGERS,
  canChatWith,
  ensureWeeklyReport,
  getReports,
  getStaff,
  isManagerOnDuty,
  isReportWindow,
  onDutyStylists,
  sastNow,
} from '@/lib/office';
import type { StaffMember, WeeklyReport } from '@/lib/office';
import Icon from '@/components/Icon';
import ManagerChatSheet from '@/components/admin/ChatSheet';
import {
  AdminGate,
  AdminHeader,
  AdminTabBar,
  CountUp,
  StaffAvatar,
  sastClock,
  useNow,
} from '@/components/admin/chrome';
import { cn } from '@/lib/utils';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Role ring colors (office.md §2). */
const RING: Record<string, string> = {
  mgr_tom: '#A9812F',
  mgr_shield: '#D4AF37',
  mgr_tech: '#211B16',
  mgr_ops: '#7A6B59',
  mgr_swift: '#2D8659',
  mgr_vogue: '#E3D5BC',
};

/** Next Monday/Wednesday/Friday/Saturday label from the current SAST day. */
function shieldBackLabel(): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = sastNow().getUTCDay();
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if ([1, 3, 5, 6].includes(d)) return names[d];
  }
  return 'Mon';
}

/** Epoch ms of the next Saturday 17:00 SAST (the report window start). */
function nextReportStart(): number {
  const d = sastNow();
  const day = d.getUTCDay();
  const hour = d.getUTCHours();
  let addDays = (6 - day + 7) % 7;
  if (addDays === 0 && hour >= 21) addDays = 7; // window over → next week
  const targetUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + addDays, 17, 0, 0);
  return targetUtc - 2 * HOUR_MS;
}

/** Epoch ms of today's 21:00 SAST (the report window end). */
function reportEndToday(): number {
  const d = sastNow();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 21, 0, 0) - 2 * HOUR_MS;
}

function countdown(to: number): string {
  const ms = Math.max(0, to - Date.now());
  const d = Math.floor(ms / DAY_MS);
  const h = Math.floor((ms % DAY_MS) / HOUR_MS);
  const m = Math.floor((ms % HOUR_MS) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return d > 0 ? `${d}d ${h}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function AdminOffice() {
  const user = useCurrentUser();
  return <AdminGate user={user}>{(admin) => <OfficeView user={admin} />}</AdminGate>;
}

function OfficeView({ user }: { user: User }) {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orders = useOrders();
  useNow(1000); // tick clock + countdowns

  const [chatWith, setChatWith] = useState<StaffMember | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>(getReports);

  const live = isReportWindow();
  const managersOnDuty = isManagerOnDuty(MANAGERS[0]);
  const dutyStylists = useMemo(() => onDutyStylists(), []);
  const shield = MANAGERS.find((m) => m.kind === 'cso')!;
  const shieldOnToday = [1, 3, 5, 6].includes(sastNow().getUTCDay());
  const isSaturday = sastNow().getUTCDay() === 6;

  // Keep reports fresh; the engine generates + emails during the window.
  useEffect(() => {
    ensureWeeklyReport();
    setReports(getReports());
    const t = window.setInterval(() => {
      ensureWeeklyReport();
      setReports(getReports());
    }, 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Deep link (?chat=mgr_shield) from the admin dashboard security card.
  useEffect(() => {
    const target = params.get('chat');
    if (!target) return;
    const staff = getStaff(target);
    if (staff && canChatWith(staff, user.email)) setChatWith(staff);
    else if (staff) setChatWith(null);
  }, [params, user.email]);

  const openChat = (staff: StaffMember) => {
    if (canChatWith(staff, user.email)) setChatWith(staff);
  };

  const activeOrders = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled',
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="pb-[96px]"
    >
      <AdminHeader
        user={user}
        title="The Office"
        subtitle="Your AI management team · 30 robots strong"
        alertCount={0}
        onBell={() => navigate('/admin?tab=payments')}
      />

      {/* ===== Duty status strip (office.md §1) ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={cn(
          'sticky top-[60px] z-[70] flex items-center justify-between gap-2 border-b px-4 py-2 backdrop-blur-md',
          live ? 'border-gold/50 text-plum' : 'border-rose-petal/30 bg-porcelain/85 text-charcoal',
        )}
        style={live ? { background: 'linear-gradient(135deg, #F2E9CF, #D4AF37)' } : undefined}
      >
        <span className="flex items-center gap-1.5 text-[0.68rem] font-semibold">
          <Icon name="schedule" size={0.85} className={live ? 'text-plum' : 'text-berry'} />
          <span className="tabular-nums">{sastClock()}</span> SAST
          <span className={cn('hidden min-[400px]:inline', live ? 'text-plum/70' : 'text-rose-deep')}>
            · Managers 06:00–18:00
          </span>
        </span>
        {live ? (
          <span className="flex items-center gap-1.5 rounded-full bg-plum px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[1px] text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" style={{ animation: 'ncPulse 1.5s infinite' }} />
            Weekly Report Session Live · {countdown(reportEndToday())}
          </span>
        ) : managersOnDuty ? (
          <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[1px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" style={{ animation: 'ncPulse 2s infinite' }} />
            On Duty
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-gold-soft/70 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[1px] text-[#8a6d00]">
            <Icon name="bedtime" size={0.75} />
            After Hours
          </span>
        )}
      </motion.div>

      <div className="space-y-8 px-4 py-6">
        {/* ===== Managers (office.md §2) ===== */}
        <section>
          <p className="script text-center text-[1.05rem] text-rose-mid">the boardroom</p>
          <h2 className="mb-4 text-center font-display text-2xl font-bold text-berry">
            The Managers
          </h2>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            {MANAGERS.map((m, i) => {
              const onDuty = isManagerOnDuty(m);
              const allowed = canChatWith(m, user.email);
              const isShield = m.kind === 'cso';
              return (
                <motion.article
                  key={m.id}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
                  whileHover={{ y: -4 }}
                  className={cn(
                    'flex flex-col items-center rounded-[20px] border bg-white p-4 text-center shadow-soft',
                    isShield ? 'border-gold/50' : 'border-blush',
                  )}
                >
                  <StaffAvatar staff={m} size={72} ring={RING[m.id]} online={onDuty} />
                  <h3 className="mt-2.5 font-display text-[1.05rem] font-bold text-berry">
                    {m.name}
                  </h3>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[1.5px] text-rose-mid">
                    {m.title}
                  </p>
                  <p className="mt-1.5 min-h-[2.4em] text-[0.74rem] leading-snug text-charcoal/75">
                    {m.bio}
                  </p>

                  {/* Availability micro-labels */}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                    {isShield ? (
                      <>
                        <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.5px] text-[#8a6d00]">
                          Mon · Wed · Fri · Sat
                        </span>
                        {!shieldOnToday && (
                          <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.5px] text-[#8a6d00]">
                            Back on {shieldBackLabel()}
                          </span>
                        )}
                        {isSaturday && (
                          <span className="rounded-full bg-berry/10 px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.5px] text-berry">
                            Joining today’s report
                          </span>
                        )}
                      </>
                    ) : (
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.5px]',
                          onDuty ? 'bg-success/10 text-success' : 'bg-gold-soft/70 text-[#8a6d00]',
                        )}
                      >
                        {onDuty ? 'On duty now' : 'Daily 06:00–18:00'}
                      </span>
                    )}
                  </div>

                  {/* Chat button / George-only lock */}
                  {isShield && !allowed ? (
                    <span className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-plum/50 py-2 text-[0.62rem] font-semibold uppercase tracking-[1px] text-plum/70">
                      <Icon name="lock" size={0.8} /> Reports to George directly
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openChat(m)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-berry to-berry-deep py-2 text-[0.62rem] font-semibold uppercase tracking-[1px] text-white shadow-[0_6px_18px_rgba(33,27,22,0.35)] transition-transform hover:-translate-y-0.5"
                    >
                      <Icon name="chat" size={0.8} /> Chat
                    </button>
                  )}
                </motion.article>
              );
            })}
          </div>
        </section>

        {/* ===== Stylists on shift (office.md §3) ===== */}
        <section>
          <p className="script text-center text-[1.05rem] text-rose-mid">on the floor now</p>
          <h2 className="mb-4 text-center font-display text-2xl font-bold text-berry">
            Sales Stylists On Shift
          </h2>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            {dutyStylists.map((s, i) => {
              // Share the live active-order load across the shift pair.
              const load = Math.max(1, Math.ceil(activeOrders / 2));
              return (
                <motion.article
                  key={s.id}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: i === 0 ? -24 : 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                  className="flex items-center gap-3 rounded-[20px] border border-blush bg-white p-4 shadow-soft"
                >
                  <StaffAvatar staff={s} size={56} online />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base font-bold text-berry">{s.name}</h3>
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[1px] text-rose-mid">
                      Sales Stylist · Shift 06:00–18:00
                    </p>
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-blush px-2.5 py-0.5 text-[0.6rem] font-bold text-berry">
                      <Icon name="forum" size={0.7} />
                      {load} customer chats active
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openChat(s)}
                    aria-label={`Chat with ${s.name}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-berry to-berry-deep text-white shadow-[0_6px_18px_rgba(33,27,22,0.35)] transition-transform hover:scale-105"
                  >
                    <Icon name="chat" size={1.05} />
                  </button>
                </motion.article>
              );
            })}
          </div>
          <p className="mt-2.5 text-center text-[0.72rem] text-rose-deep">
            24 stylists rotate in shifts — these two are on the floor now, chatting with customers.
          </p>
        </section>

        {/* ===== Saturday Report Room (office.md §5) ===== */}
        <ReportRoom
          live={live}
          reports={reports}
          reduced={!!reduced}
          shieldName={shield.name}
        />

        {/* ===== Footer note (office.md §6) ===== */}
        <motion.footer
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="pb-2 text-center"
        >
          <p className="script text-lg text-rose-mid">30 robots. One crown. Zero missed beats.</p>
          <p className="mt-1 text-[0.68rem] text-rose-deep">
            Managers report every Saturday evening. Agent Shield watches the doors Mon · Wed · Fri ·
            Sat.
          </p>
        </motion.footer>
      </div>

      <AdminTabBar active="office" />

      <ManagerChatSheet
        staff={chatWith}
        adminEmail={user.email}
        onClose={() => setChatWith(null)}
      />
    </motion.div>
  );
}

/* ============================================================
   Saturday Report Room
   ============================================================ */

function ReportRoom({
  live,
  reports,
  reduced,
  shieldName,
}: {
  live: boolean;
  reports: WeeklyReport[];
  reduced: boolean;
  shieldName: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const latest = reports[0] ?? null;

  const download = (r: WeeklyReport) => {
    const text = [
      `NaumiCrowns Weekly Business Report — ${r.weekLabel}`,
      '',
      `Revenue: ${formatPrice(r.kpis.revenue)}`,
      `Orders: ${r.kpis.orders} (avg ${formatPrice(r.kpis.avgOrderValue)})`,
      `Pending payments: ${r.kpis.pendingPayments}`,
      `Delivered: ${r.kpis.delivered}`,
      `Product likes: ${r.kpis.likes}`,
      '',
      ...r.sections.flatMap((s) => [s.title, s.body, '']),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `naumicrowns-report-${r.weekLabel}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      className="rounded-[24px] p-5 text-white shadow-float"
      style={{
        background: 'linear-gradient(135deg, #211B16, #151110)',
        boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.6), 0 25px 50px rgba(33,27,22,0.25)',
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">Saturday Operations Report</h2>
        {live && (
          <span className="flex items-center gap-1.5 rounded-full bg-gold px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[1px] text-plum">
            <span className="h-1.5 w-1.5 rounded-full bg-plum" style={{ animation: 'ncPulse 1.5s infinite' }} />
            Live
          </span>
        )}
      </div>
      <p className="mb-4 text-[0.72rem] text-white/80">
        Every Saturday, 17:00–21:00 SAST · presented by all managers · {shieldName} joins · emailed
        to both of you (George & Naumi)
      </p>

      {live && latest ? (
        <LiveReport report={latest} reduced={reduced} />
      ) : (
        <div className="rounded-2xl bg-white/10 p-4 text-center">
          <Icon name="event_upcoming" size={1.4} className="mx-auto mb-1.5 text-gold" />
          <p className="text-[0.78rem] font-semibold">
            Next session in{' '}
            <span className="font-display text-base font-bold tabular-nums text-gold">
              {countdown(nextReportStart())}
            </span>
          </p>
          <p className="mt-0.5 text-[0.68rem] text-white/70">
            Saturday 17:00 SAST — the managers present, and the report lands in both your inboxes.
          </p>
        </div>
      )}

      {/* Archive */}
      {reports.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[1.5px] text-rose-petal">
            Past reports
          </p>
          <ul className="space-y-2">
            {reports.slice(0, 6).map((r) => (
              <li key={r.id} className="rounded-xl bg-white/10">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  aria-expanded={openId === r.id}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
                >
                  <Icon name="summarize" size={0.95} className="shrink-0 text-gold" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.76rem] font-semibold">Week {r.weekLabel}</span>
                    <span className="block text-[0.62rem] text-white/70">
                      {formatPrice(r.kpis.revenue)} · {r.kpis.orders} orders ·{' '}
                      {new Date(r.generatedAt).toLocaleDateString('en-ZA', {
                        timeZone: 'Africa/Johannesburg',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Download report ${r.weekLabel}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      download(r);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        download(r);
                      }
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold transition-colors hover:bg-white/25"
                  >
                    <Icon name="download" size={0.9} />
                  </span>
                  <Icon
                    name={openId === r.id ? 'expand_less' : 'expand_more'}
                    size={1}
                    className="shrink-0 text-rose-petal"
                  />
                </button>
                <AnimatePresence>
                  {openId === r.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 px-3 pb-3">
                        {r.sections.map((s) => (
                          <div key={s.managerId} className="rounded-lg bg-white/10 px-3 py-2">
                            <p className="text-[0.68rem] font-bold text-gold">{s.title}</p>
                            <p className="text-[0.68rem] leading-relaxed text-white/85">{s.body}</p>
                          </div>
                        ))}
                        <EmailedChip emailedTo={r.emailedTo} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function EmailedChip({ emailedTo }: { emailedTo: string[] }) {
  return (
    <p className="flex items-start gap-1.5 rounded-lg bg-success/25 px-3 py-2 text-[0.66rem] font-semibold text-white">
      <Icon name="mark_email_read" size={0.85} className="mt-0.5 shrink-0 text-online" />
      Email sent ✓ — this report was emailed to {emailedTo.join(' and ')} (the 2 configured admin
      emails).
    </p>
  );
}

/** During the window: managers present their sections chat-style. */
function LiveReport({ report, reduced }: { report: WeeklyReport; reduced: boolean }) {
  return (
    <div>
      {/* KPIs row with count-up */}
      <div className="mb-4 grid grid-cols-4 gap-1.5 text-center">
        {[
          { label: 'Orders', value: report.kpis.orders, fmt: (n: number) => String(n) },
          { label: 'Revenue', value: report.kpis.revenue, fmt: (n: number) => formatPrice(n) },
          { label: 'Pending', value: report.kpis.pendingPayments, fmt: (n: number) => String(n) },
          { label: 'Delivered', value: report.kpis.delivered, fmt: (n: number) => String(n) },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-white/10 px-1 py-2">
            <CountUp
              value={kpi.value}
              format={kpi.fmt}
              className="block font-display text-[0.82rem] font-bold text-gold"
            />
            <span className="text-[0.55rem] font-semibold uppercase tracking-[0.5px] text-white/70">
              {kpi.label}
            </span>
          </div>
        ))}
      </div>

      {/* Manager sections, staggered like chat messages */}
      <div className="space-y-3">
        {report.sections.map((s, i) => {
          const staff = getStaff(s.managerId);
          return (
            <motion.div
              key={s.managerId}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.4, duration: 0.4, ease: 'easeOut' }}
              className="flex items-start gap-2.5"
            >
              {staff && <StaffAvatar staff={staff} size={36} ring="#D4AF37" />}
              <div className="min-w-0 flex-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-charcoal shadow-soft">
                <p className="text-[0.68rem] font-bold text-berry">{s.title}</p>
                <p className="text-[0.72rem] leading-relaxed text-charcoal/85">{s.body}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4">
        <EmailedChip emailedTo={report.emailedTo} />
      </div>
    </div>
  );
}
