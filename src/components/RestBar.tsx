import { useEffect, useReducer, useSyncExternalStore } from "react";
import { extendRest, getRest, stopRest, subscribeRest } from "../lib/rest";

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return String(Math.floor(s / 60)) + ":" + String(s % 60).padStart(2, "0");
};

export function RestBar() {
  const st = useSyncExternalStore(subscribeRest, getRest, () => null);
  const [, force] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!st || st.endAt <= Date.now()) return;
    const id = setInterval(force, 200);
    return () => clearInterval(id);
  }, [st?.endAt, force]);

  if (!st) return null;

  const left = Math.max(0, st.endAt - Date.now());
  const pct = st.totalMs ? Math.min(100, (left / st.totalMs) * 100) : 0;
  const done = left === 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-3 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto rounded-2xl border border-line bg-surface/95 p-3 shadow-xl backdrop-blur">
        <div className="flex items-center gap-3">
          <div className={"w-16 text-2xl font-bold tabular-nums " + (done ? "text-accent" : "")}>
            {done ? "0:00" : mmss(left)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] text-muted">
              {st.label}
              {done ? " · 休息结束" : ""}
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface2">
              <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: pct + "%" }} />
            </div>
          </div>
          <button
            onClick={() => extendRest(15)}
            className="press h-10 rounded-xl border border-line px-2.5 text-[11px] text-muted"
          >
            +15s
          </button>
          <button onClick={stopRest} className="press h-10 rounded-xl bg-accent px-3 text-[11px] font-semibold text-onaccent">
            跳过
          </button>
        </div>
      </div>
    </div>
  );
}
