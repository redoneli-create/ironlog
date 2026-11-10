import { Capacitor, registerPlugin } from "@capacitor/core";

interface PlanWidgetBridge {
  setPlan(opts: { title: string; plan: string }): Promise<void>;
}

const Native = registerPlugin<PlanWidgetBridge>("PlanWidget");

/** 同步「今天练什么」到桌面小组件 */
export async function syncPlanWidget(plan: string, title = "今天练什么"): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Native.setPlan({ title, plan });
  } catch {
    /* 没有小组件或未授权时忽略 */
  }
}
