import { useSyncExternalStore } from "react";

export interface CardioState {
  exId: string;
  label: string;
  targetMin: number;
  startedAt: number;
  /** 暂停时累计的毫秒 */
  elapsedBefore: number;
  paused: boolean;
  clockOpen: boolean;
}

const KEY = "yudong-cardio";
let state: CardioState | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw) as CardioState;
  } catch {
    state = null;
  }
}
load();

export function cardioElapsed(s: CardioState, now = Date.now()): number {
  return s.elapsedBefore + (s.paused ? 0 : now - s.startedAt);
}

export const cardio = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  start(exId: string, label: string, targetMin: number) {
    state = { exId, label, targetMin, startedAt: Date.now(), elapsedBefore: 0, paused: false, clockOpen: true };
    emit();
  },
  pause() {
    if (!state || state.paused) return;
    state = { ...state, elapsedBefore: cardioElapsed(state), paused: true };
    emit();
  },
  resume() {
    if (!state || !state.paused) return;
    state = { ...state, startedAt: Date.now(), paused: false };
    emit();
  },
  openClock() {
    if (!state) return;
    state = { ...state, clockOpen: true };
    emit();
  },
  closeClock() {
    if (!state) return;
    state = { ...state, clockOpen: false };
    emit();
  },
  stop() {
    state = null;
    emit();
  },
};

export function useCardio(): CardioState | null {
  return useSyncExternalStore(cardio.subscribe, cardio.get, () => null);
}
