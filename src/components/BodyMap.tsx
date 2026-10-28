import { MUSCLES } from "../data/muscles";
import { Chip } from "./ui";

interface Region {
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const FRONT: Region[] = [
  { id: "shoulders", cx: 58, cy: 66, rx: 8, ry: 6 },
  { id: "shoulders", cx: 102, cy: 66, rx: 8, ry: 6 },
  { id: "chest", cx: 69, cy: 78, rx: 10, ry: 8 },
  { id: "chest", cx: 91, cy: 78, rx: 10, ry: 8 },
  { id: "biceps", cx: 48, cy: 92, rx: 6, ry: 13 },
  { id: "biceps", cx: 112, cy: 92, rx: 6, ry: 13 },
  { id: "forearms", cx: 45, cy: 130, rx: 5, ry: 13 },
  { id: "forearms", cx: 115, cy: 130, rx: 5, ry: 13 },
  { id: "abs", cx: 80, cy: 108, rx: 9, ry: 17 },
  { id: "obliques", cx: 66, cy: 112, rx: 4, ry: 14 },
  { id: "obliques", cx: 94, cy: 112, rx: 4, ry: 14 },
  { id: "quads", cx: 70, cy: 186, rx: 8, ry: 24 },
  { id: "quads", cx: 90, cy: 186, rx: 8, ry: 24 },
  { id: "calves", cx: 71, cy: 247, rx: 7, ry: 18 },
  { id: "calves", cx: 89, cy: 247, rx: 7, ry: 18 },
];

const BACK: Region[] = [
  { id: "traps", cx: 240, cy: 68, rx: 15, ry: 9 },
  { id: "rear-delt", cx: 219, cy: 72, rx: 7, ry: 6 },
  { id: "rear-delt", cx: 261, cy: 72, rx: 7, ry: 6 },
  { id: "lats", cx: 229, cy: 98, rx: 9, ry: 15 },
  { id: "lats", cx: 251, cy: 98, rx: 9, ry: 15 },
  { id: "teres", cx: 222, cy: 86, rx: 4, ry: 4 },
  { id: "teres", cx: 258, cy: 86, rx: 4, ry: 4 },
  { id: "triceps", cx: 210, cy: 94, rx: 6, ry: 13 },
  { id: "triceps", cx: 270, cy: 94, rx: 6, ry: 13 },
  { id: "forearms", cx: 207, cy: 130, rx: 5, ry: 13 },
  { id: "forearms", cx: 273, cy: 130, rx: 5, ry: 13 },
  { id: "glute-med", cx: 221, cy: 143, rx: 5, ry: 6 },
  { id: "glute-med", cx: 259, cy: 143, rx: 5, ry: 6 },
  { id: "glute-max", cx: 229, cy: 156, rx: 10, ry: 9 },
  { id: "glute-max", cx: 251, cy: 156, rx: 10, ry: 9 },
  { id: "hams", cx: 229, cy: 194, rx: 8, ry: 19 },
  { id: "hams", cx: 251, cy: 194, rx: 8, ry: 19 },
  { id: "calves", cx: 231, cy: 247, rx: 7, ry: 18 },
  { id: "calves", cx: 249, cy: 247, rx: 7, ry: 18 },
];

function Silhouette({ cx }: { cx: number }) {
  return (
    <g fill="var(--surface2)" stroke="var(--line)" strokeWidth="1">
      <circle cx={cx} cy={34} r={15} />
      <rect x={cx - 5} y={46} width={10} height={11} rx={4} />
      <path
        d={
          "M" + (cx - 22) + " 60 C" + (cx - 22) + " 56," + (cx + 22) + " 56," + (cx + 22) + " 60 " +
          "L" + (cx + 20) + " 112 C" + (cx + 20) + " 122," + (cx + 12) + " 130," + (cx + 10) + " 132 " +
          "L" + (cx - 10) + " 132 C" + (cx - 12) + " 130," + (cx - 20) + " 122," + (cx - 20) + " 112 Z"
        }
      />
      <rect x={cx - 18} y={130} width={36} height={30} rx={12} />
      <rect x={cx - 36} y={62} width={13} height={54} rx={6.5} />
      <rect x={cx + 23} y={62} width={13} height={54} rx={6.5} />
      <rect x={cx - 38} y={114} width={11} height={46} rx={5.5} />
      <rect x={cx + 27} y={114} width={11} height={46} rx={5.5} />
      <rect x={cx - 16} y={158} width={14} height={66} rx={7} />
      <rect x={cx + 2} y={158} width={14} height={66} rx={7} />
      <rect x={cx - 15} y={222} width={12} height={60} rx={6} />
      <rect x={cx + 3} y={222} width={12} height={60} rx={6} />
    </g>
  );
}

function Regions({ list, active, onPick }: { list: Region[]; active: string | null; onPick: (id: string) => void }) {
  return (
    <g>
      {list.map((r, i) => (
        <ellipse
          key={r.id + i}
          cx={r.cx}
          cy={r.cy}
          rx={r.rx}
          ry={r.ry}
          fill="var(--accent)"
          fillOpacity={active === r.id ? 0.55 : 0.22}
          stroke="var(--accent)"
          strokeOpacity={active === r.id ? 0.95 : 0.5}
          strokeWidth={active === r.id ? 1.8 : 1}
          onClick={() => onPick(r.id)}
          className="cursor-pointer"
        />
      ))}
    </g>
  );
}

export function BodyMap({ active, onPick }: { active: string | null; onPick: (id: string) => void }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-3">
      <svg viewBox="0 0 320 300" className="w-full">
        <Silhouette cx={80} />
        <Regions list={FRONT} active={active} onPick={onPick} />
        <Silhouette cx={240} />
        <Regions list={BACK} active={active} onPick={onPick} />
        <text x={80} y={292} textAnchor="middle" fill="var(--muted)" fontSize="11">前面</text>
        <text x={240} y={292} textAnchor="middle" fill="var(--muted)" fontSize="11">背面</text>
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {MUSCLES.map((m) => (
          <Chip key={m.id} active={active === m.id} onClick={() => onPick(m.id)}>
            {m.zh}
          </Chip>
        ))}
      </div>
      <p className="mt-2 text-center text-[12px] text-muted">点肌肉筛选动作，臀大肌 / 臀中肌 / 大圆肌 单独分区</p>
    </div>
  );
}
