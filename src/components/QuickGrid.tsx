import { Icon, type IconName } from "./Icons";

export interface QuickItem {
  id: string;
  label: string;
  icon: IconName;
  bg: string;
  fg: string;
  onClick: () => void;
}

/** 首页金刚区：彩色圆角图标 + 文字，跟大众点评那种快捷入口一致 */
export function QuickGrid({ items }: { items: QuickItem[] }) {
  return (
    <div className="grid grid-cols-4 gap-y-3">
      {items.map((item) => (
        <button key={item.id} onClick={item.onClick} className="press flex flex-col items-center gap-1.5">
          <span
            className="grid h-14 w-14 place-items-center rounded-[18px]"
            style={{ background: item.bg, color: item.fg }}
          >
            <Icon name={item.icon} size={26} />
          </span>
          <span className="text-[12px] text-ink/80">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
