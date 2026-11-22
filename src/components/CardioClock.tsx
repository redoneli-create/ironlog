import { useEffect, useRef, useState } from "react";
import { activeSession, toggleSet } from "../lib/session";
import { cardio, cardioElapsed, useCardio } from "../lib/cardioTimer";
import { fireAlarm } from "../lib/rest";

const fmt = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
};

/** 有氧番茄钟：全屏大计时 + 进度环，结束时直接写进当前训练 */
export function CardioClock() {
  const state = useCardio();
  const [now, setNow] = useState(Date.now());
  const alerted = useRef(false);

  useEffect(() => {
    if (!state || state.paused) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [state?.paused, state?.startedAt]);

  if (!state || !state.clockOpen) return null;

  const elapsed = cardioElapsed(state, now);
  const total = state.targetMin * 60_000;
  const remaining = total - elapsed;
  const done = remaining <= 0;

  if (done && !alerted.current) {
    alerted.current = true;
    fireAlarm();
  }

  const progress = Math.min(1, elapsed / total);
  const R = 130;
  const C = 2 * Math.PI * R;

  const finish = async () => {
    const mins = Math.max(1, Math.round(elapsed / 60000));
    const s = await activeSession();
    if (s) await toggleSet(s, state.exId, 1, 0, 0, mins * 60);
    cardio.stop();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg px-6 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <button onClick={() => cardio.closeClock()} className="text-sm text-muted">
          收起
        </button>
        <span className="text-[12px] text-muted">有氧计时</span>
        <span className="w-10" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="text-[13px] text-muted">{state.label}</div>

        <div className="relative mt-4 h-[300px] w-[300px]">
          <svg viewBox="0 0 300 300" className="h-full w-full -rotate-90">
            <circle cx="150" cy="150" r={R} fill="none" stroke="var(--line)" strokeWidth="12" />
            <circle
              cx="150"
              cy="150"
              r={R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.3s linear" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-6xl font-bold tabular-nums">{fmt(Math.abs(remaining))}</div>
              <div className="mt-2 text-[12px] text-muted">
                {done ? "已达标，点完成记录" : state.paused ? "已暂停" : "剩余"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-[12px] text-muted">
          已进行 {Math.floor(elapsed / 60000)} 分 {Math.floor((elapsed % 60000) / 1000)} 秒 · 目标 {state.targetMin} 分钟
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex gap-2.5">
          <button
            onClick={() => (state.paused ? cardio.resume() : cardio.pause())}
            className="press h-14 flex-1 rounded-xl border border-line bg-surface text-base font-semibold"
          >
            {state.paused ? "继续" : "暂停"}
          </button>
          <button
            onClick={() => void finish()}
            className="press h-14 flex-1 rounded-xl bg-accent text-base font-semibold text-onaccent"
          >
            完成并记录
          </button>
        </div>
        <button onClick={() => cardio.stop()} className="press h-12 w-full rounded-xl bg-surface2 text-sm text-muted">
          放弃本次
        </button>
      </div>
    </div>
  );
}

/** 非全屏时的悬浮小条，切到其它 tab 也能看到 */
export function CardioPill() {
  const state = useCardio();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!state || state.paused) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [state?.paused, state?.startedAt]);

  if (!state || state.clockOpen) return null;
  const elapsed = cardioElapsed(state, now);
  const remaining = state.targetMin * 60_000 - elapsed;

  return (
    <button
      onClick={() => cardio.openClock()}
      className="press fixed bottom-[76px] left-4 right-4 z-30 flex items-center justify-between rounded-2xl bg-accent px-4 py-3 text-onaccent shadow-lg"
    >
      <span className="text-[12px] opacity-90">有氧 · {state.label}</span>
      <span className="tabular-nums text-sm font-semibold">
        {remaining > 0 ? "剩 " + fmt(remaining) : "已超 " + fmt(-remaining)}
      </span>
    </button>
  );
}
