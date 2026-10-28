import { useEffect, useRef, type ReactNode } from "react";
import { pushBack } from "../lib/backstack";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={"rounded-3xl border border-line bg-surface p-4 " + className}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <h3 className="text-sm font-semibold">{children}</h3>
      {right}
    </div>
  );
}

export function Btn(props: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost";
  className?: string;
  disabled?: boolean;
}) {
  const style =
    props.kind === "ghost"
      ? "border border-line bg-surface2 text-ink"
      : "bg-accent text-onaccent";
  return (
    <button
      disabled={props.disabled}
      onClick={props.onClick}
      className={
        "press w-full rounded-xl py-3.5 text-sm font-semibold disabled:opacity-40 " +
        style +
        " " +
        (props.className ?? "")
      }
    >
      {props.children}
    </button>
  );
}

export function Chip(props: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={
        "press shrink-0 rounded-lg border px-2.5 py-1.5 text-[12px] " +
        (props.active ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface2 text-muted")
      }
    >
      {props.children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[12px] text-muted">{label}</div>
      {children}
    </label>
  );
}

export function TextInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric";
  type?: string;
  className?: string;
}) {
  return (
    <input
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      inputMode={props.inputMode}
      type={props.type ?? "text"}
      className={
        "h-11 w-full rounded-xl bg-surface2 px-3 text-sm outline-none focus:ring-2 focus:ring-accent/50 " +
        (props.className ?? "")
      }
    />
  );
}

export function Sheet(props: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** 固定在底部、始终可见的操作区 */
  footer?: ReactNode;
  /** full: 占屏 92%，适合编辑器 */
  size?: "auto" | "full";
}) {
  const closeRef = useRef(props.onClose);
  closeRef.current = props.onClose;

  useEffect(() => {
    if (!props.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    return pushBack(() => {
      closeRef.current();
      return true;
    });
  }, [props.open]);

  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/55" onClick={props.onClose}>
      <div
        className={
          "flex w-full flex-col overflow-hidden rounded-t-3xl border-t border-line bg-surface " +
          (props.size === "full" ? "h-[92vh]" : "max-h-[88vh]")
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
          <h3 className="text-base font-semibold">{props.title ?? ""}</h3>
          <button onClick={props.onClose} className="px-2 py-1 text-xs text-muted">
            关闭
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{props.children}</div>
        {props.footer && (
          <div className="shrink-0 border-t border-line bg-surface px-4 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3">
            {props.footer}
          </div>
        )}
      </div>
    </div>
  );
}

export const Empty = ({ text }: { text: string }) => (
  <p className="px-1 py-6 text-center text-xs text-muted">{text}</p>
);
