import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { useConsole } from '../context/ConsoleContext.tsx';

export const ConfirmSheet: React.FC = () => {
  const { confirmReq, closeConfirm, pushToast } = useConsole();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (!confirmReq || busy) return;
    setBusy(true);
    try {
      await confirmReq.onConfirm();
      closeConfirm();
    } catch (err) {
      pushToast({
        title: 'Action failed',
        detail: err instanceof Error ? err.message : 'Unexpected error.',
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {confirmReq && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4"
          onClick={() => !busy && closeConfirm()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="pane-elevated w-full max-w-[440px] overflow-hidden rounded-[6px] border border-[var(--border-hairline)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 p-5">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border ${
                  confirmReq.destructive
                    ? 'border-[var(--signal-crimson)]/30 bg-[var(--signal-crimson)]/10 text-[var(--signal-crimson)]'
                    : 'border-[var(--accent-indigo)]/30 bg-[var(--accent-indigo)]/10 text-[var(--accent-text)]'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-semibold text-[var(--ink-primary)] leading-snug">
                  {confirmReq.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-secondary)]">
                  {confirmReq.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-3">
              <button
                type="button"
                disabled={busy}
                onClick={closeConfirm}
                className="rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-hover)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--ink-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirm}
                className={`rounded-[6px] px-3.5 py-1.5 text-[13px] font-medium text-[var(--on-accent)] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 ${
                  confirmReq.destructive
                    ? 'bg-[var(--signal-crimson)] hover:bg-[var(--signal-crimson-hover)]'
                    : 'bg-[var(--accent-indigo)] hover:bg-[var(--accent-indigo-hover)]'
                }`}
              >
                {busy ? 'Executing…' : confirmReq.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
