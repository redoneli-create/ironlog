export interface ToastItem {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

let items: ToastItem[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const subscribeToasts = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};

export const getToasts = () => items;

export function dismissToast(id: string) {
  items = items.filter((i) => i.id !== id);
  emit();
}

export function toast(message: string, actionLabel?: string, onAction?: () => void) {
  const id = Math.random().toString(36).slice(2);
  items = [...items.slice(-2), { id, message, actionLabel, onAction }];
  emit();
  setTimeout(() => dismissToast(id), 5200);
}
