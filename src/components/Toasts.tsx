import { useSyncExternalStore } from "react";
import { dismissToast, getToasts, subscribeToasts } from "../lib/toast";

export function Toasts() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, () => []);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-md flex-col gap-2 px-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-surface2/95 px-3 py-2.5 shadow-xl backdrop-blur"
        >
          <span className="min-w-0 flex-1 truncate text-xs">{t.message}</span>
          {t.actionLabel && (
            <button
              onClick={() => {
                t.onAction?.();
                dismissToast(t.id);
              }}
              className="shrink-0 rounded-lg bg-accent/15 px-2.5 py-1 text-[12px] font-semibold text-accent"
            >
              {t.actionLabel}
            </button>
          )}
          <button onClick={() => dismissToast(t.id)} className="shrink-0 px-1 text-xs text-muted">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
