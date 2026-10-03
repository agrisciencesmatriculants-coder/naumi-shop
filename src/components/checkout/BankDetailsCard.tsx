import { useState } from 'react';
import { BANK_DETAILS } from '@/lib/backend';
import { useApp } from '@/store/AppContext';
import Icon from '@/components/Icon';
import { cn } from '@/lib/utils';

function CopyRow({
  label,
  value,
  copyValue,
  highlight = false,
}: {
  label: string;
  value: string;
  copyValue?: string;
  highlight?: boolean;
}) {
  const { showToast } = useApp();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = copyValue ?? value;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied`, 'success');
    } catch {
      // Fallback for non-secure contexts
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(`${label} copied`, 'success');
      } catch {
        showToast('Could not copy — please long-press to copy', 'error');
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
      <div className="min-w-0">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[1px] text-white/70">
          {label}
        </p>
        <p
          className={cn(
            'truncate font-mono text-sm font-bold',
            highlight ? 'text-gold-soft' : 'text-white',
          )}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors',
          copied ? 'bg-success text-white' : 'bg-white/15 text-white hover:bg-white/25',
        )}
      >
        <Icon name={copied ? 'check' : 'content_copy'} size={1} />
      </button>
    </div>
  );
}

/**
 * NaumiCrowns banking details card (payment.md §4): berry gradient,
 * glass rows, tap-to-copy chips for account / PayShap / reference.
 */
export default function BankDetailsCard({ reference }: { reference: string }) {
  return (
    <section
      className="rounded-[20px] p-4 text-white shadow-pink"
      style={{ background: 'linear-gradient(135deg, #211B16, #151110)' }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <Icon name="account_balance" size={1.05} />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold">Our banking details</h3>
          <p className="text-[0.68rem] text-white/75">PayShap or Capitec cellphone pay</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[1px] text-white/70">Bank</p>
            <p className="text-sm font-bold">
              {BANK_DETAILS.bank} · {BANK_DETAILS.accountName}
            </p>
          </div>
          <p className="shrink-0 text-[0.68rem] text-white/75">Branch {BANK_DETAILS.branchCode}</p>
        </div>
        <CopyRow label="Account Number" value={BANK_DETAILS.accountNumber} />
        <CopyRow label="PayShap Number" value={BANK_DETAILS.payshapNumber} />
        <CopyRow label="Reference" value={reference} highlight />
      </div>
      <p className="mt-2.5 text-[0.68rem] leading-relaxed text-white/80">
        Use your order number <span className="font-mono font-bold text-gold-soft">{reference}</span> as
        the payment reference so we can match your payment automatically.
      </p>
    </section>
  );
}
