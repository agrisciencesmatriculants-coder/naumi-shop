import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import Icon from '@/components/Icon';
import { cn } from '@/lib/utils';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Proof-of-payment dropzone (payment.md §4): dashed blush border,
 * tap to upload an image, thumbnail preview with replace/remove.
 * Emits a dataURL (attachProofOfPayment requires `data:image/...`).
 */
export default function ProofUpload({
  dataUrl,
  fileName,
  onSelect,
  onClear,
}: {
  dataUrl: string | null;
  fileName: string | null;
  onSelect: (dataUrl: string, fileName: string) => void;
  onClear: () => void;
}) {
  const { showToast } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const reduced = useReducedMotion();

  /**
   * Downscale via canvas before encoding: raw 5MB photos become ~7MB base64
   * and blow the localStorage quota (silently lost). Max 1200px, JPEG 0.82
   * keeps proofs legible at ~150–400KB.
   */
  const downscale = (img: HTMLImageElement): string => {
    const MAX_DIM = 1200;
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no-canvas');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.82);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image (screenshot or photo) of your payment.', 'error');
      return;
    }
    if (file.size > MAX_BYTES) {
      showToast('File too large — max 5MB.', 'error');
      return;
    }
    setReading(true);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const dataUrl = downscale(img);
        setReading(false);
        onSelect(dataUrl, file.name);
      } catch {
        setReading(false);
        showToast('Could not process that image — try a screenshot instead.', 'error');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setReading(false);
      showToast('Could not read that file — please try again.', 'error');
    };
    img.src = url;
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {dataUrl ? (
          <motion.div
            key="preview"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="flex items-center gap-3 rounded-2xl border-2 border-success/50 bg-white p-3 shadow-soft"
          >
            <img
              src={dataUrl}
              alt="Proof of payment preview"
              className="h-16 w-16 shrink-0 rounded-xl border border-success/30 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-[1px] text-success">
                <Icon name="check_circle" size={0.85} />
                Proof attached
              </p>
              <p className="truncate text-sm font-medium text-charcoal">{fileName ?? 'proof-of-payment'}</p>
              <div className="mt-1 flex gap-3">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex min-h-[44px] items-center text-[0.75rem] font-semibold text-berry underline underline-offset-2"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="flex min-h-[44px] items-center text-[0.75rem] font-semibold text-rose-deep underline underline-offset-2"
                >
                  Remove
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="dropzone"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              'flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-white px-4 py-6 text-center transition-colors',
              dragOver ? 'border-berry bg-blush/60' : 'border-rose-petal/70 hover:border-berry/60',
            )}
          >
            <span
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full text-white',
                reading && 'animate-[spin_1s_linear_infinite]',
              )}
              style={{ background: 'linear-gradient(135deg, #E3D5BC, #211B16)' }}
            >
              <Icon name={reading ? 'progress_activity' : 'cloud_upload'} size={1.2} />
            </span>
            <span className="text-sm font-semibold text-charcoal">
              {reading ? 'Reading file…' : 'Tap to upload a screenshot / photo of your payment'}
            </span>
            <span className="text-[0.68rem] text-rose-deep">Image files only · max 5MB</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
