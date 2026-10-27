import { Capacitor, registerPlugin } from "@capacitor/core";

interface RestOverlayBridge {
  canDraw(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  show(opts: { endAt: number; label: string }): Promise<void>;
  hide(): Promise<void>;
}

const Native = registerPlugin<RestOverlayBridge>("RestOverlay");

export const isNativeApp = () => Capacitor.isNativePlatform();

export async function overlayGranted(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    return (await Native.canDraw()).granted;
  } catch {
    return false;
  }
}

/** 请求「显示在其他应用上层」权限，跳到系统设置页 */
export async function requestOverlay(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await Native.requestPermission();
  } catch {
    /* 用户取消 */
  }
}

export async function showOverlay(endAt: number, label: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await Native.show({ endAt, label });
  } catch {
    /* 未授权则静默失败 */
  }
}

export async function hideOverlay(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await Native.hide();
  } catch {
    /* ignore */
  }
}
