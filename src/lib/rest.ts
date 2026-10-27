import { notifyRestDone } from "./notify";

export type RestState = { endAt: number; totalMs: number; label: string } | null;

const KEY = "ironlog.rest";
let state: RestState = null;
const subs = new Set<() => void>();
let alarm: ReturnType<typeof setTimeout> | null = null;

const emit = () => subs.forEach((f) => f());

function persist() {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

function schedule() {
  if (alarm) clearTimeout(alarm);
  alarm = null;
  if (!state) return;
  const ms = state.endAt - Date.now();
  if (ms > 0) alarm = setTimeout(fire, ms);
}

export function fireAlarm() {
  try {
    navigator.vibrate?.([180, 90, 180, 90, 320]);
  } catch {
    /* unsupported */
  }
  try {
    const Ctx = window.AudioContext;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;
    [0, 0.22, 0.44].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 2 ? 1046 : 880;
      gain.gain.setValueAtTime(0.0001, t0 + t);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + t);
      osc.stop(t0 + t + 0.2);
    });
    setTimeout(() => void ctx.close(), 1400);
  } catch {
    /* audio blocked */
  }
}

function fire() {
  if (!state) return;
  const label = state.label;
  state = { ...state, endAt: Date.now() };
  persist();
  emit();
  fireAlarm();
  if (typeof document !== "undefined" && document.hidden) notifyRestDone(label);
}

export const subscribeRest = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};

export const getRest = () => state;

export function startRest(sec: number, label = "休息") {
  if (!sec || sec <= 0) {
    stopRest();
    return;
  }
  state = { endAt: Date.now() + sec * 1000, totalMs: sec * 1000, label };
  persist();
  schedule();
  emit();
}

export function extendRest(deltaSec: number) {
  if (!state) return;
  state = { ...state, endAt: state.endAt + deltaSec * 1000, totalMs: state.totalMs + Math.max(0, deltaSec) * 1000 };
  persist();
  schedule();
  emit();
}

export function stopRest() {
  if (alarm) clearTimeout(alarm);
  alarm = null;
  state = null;
  persist();
  emit();
}

export const restLeft = () => (state ? Math.max(0, state.endAt - Date.now()) : 0);

// Resume a rest that was running before a reload / app switch.
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw) as { endAt: number; totalMs: number; label: string };
    if (saved.endAt > Date.now()) {
      state = saved;
      schedule();
    } else {
      localStorage.removeItem(KEY);
    }
  }
} catch {
  /* ignore */
}
