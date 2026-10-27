export async function ensureNotifyPermission() {
  try {
    if (!("Notification" in window) || Notification.permission !== "default") return;
    await Notification.requestPermission();
  } catch {
    /* 不支持或被拒 */
  }
}

export function notifyRestDone(label: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification("休息结束", { body: label + " · 该下一组了", tag: "ironlog-rest" });
  } catch {
    /* 忽略 */
  }
}
