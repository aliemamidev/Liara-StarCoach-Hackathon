import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

export function Toast({ notification, onOpen, onDismiss }) {
  const [seconds, setSeconds] = useState(6);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          onDismiss();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onDismiss]);

  if (!notification || seconds === 0) return null;

  return (
    <div className="admin-toast fixed inset-x-4 top-4 z-[60] flex justify-center sm:inset-x-auto sm:right-6 sm:w-[380px]" dir="rtl">
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 rounded-2xl border border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface))] p-4 text-right shadow-[0_18px_55px_hsl(var(--site-text)/.16)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_hsl(var(--site-text)/.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--site-accent))]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--site-accent)/.14)] text-[hsl(var(--site-accent-strong))]"><Bell size={18} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-extrabold text-[hsl(var(--site-text))]">{notification.title}</span>
          <span className="mt-1 block truncate text-[11px] leading-5 text-[hsl(var(--site-muted))]">{notification.description}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[10px] font-extrabold text-[hsl(var(--site-accent-strong))]"><span>{seconds}</span><X size={13} aria-hidden="true" /></span>
      </button>
    </div>
  );
}
