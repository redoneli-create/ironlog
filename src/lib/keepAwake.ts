type Sentinel = { release: () => Promise<void> };

let lock: Sentinel | null = null;
let enabled = false;

async function acquire() {
  const nav = navigator as Navigator & { wakeLock?: { request: (type: string) => Promise<Sentinel> } };
  if (!nav.wakeLock) return;
  try {
    lock = await nav.wakeLock.request("screen");
  } catch {
    lock = null;
  }
}

function release() {
  void lock?.release().catch(() => undefined);
  lock = null;
}

/** 训练期间保持屏幕常亮，避免后台节流导致计时声不响。 */
export function keepScreenOn(on: boolean) {
  enabled = on;
  if (on) {
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
  } else {
    document.removeEventListener("visibilitychange", onVisible);
    release();
  }
}

function onVisible() {
  if (!enabled) return;
  if (document.visibilityState === "visible" && !lock) void acquire();
}

export function screenLockHeld() {
  return !!lock;
}
