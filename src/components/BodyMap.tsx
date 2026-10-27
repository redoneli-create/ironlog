import { BODY_PART_ZH } from "../lib/db";
import { Chip } from "./ui";

type Region = { part: string; cx: number; cy: number; rx: number; ry: number };

/** 前侧肌群 */
const FRONT: Region[] = [
  { part: "shoulders", cx: 60, cy: 66, rx: 9, ry: 7 },
  { part: "shoulders", cx: 100, cy: 66, rx: 9, ry: 7 },
  { part: "chest", cx: 80, cy: 78, rx: 20, ry: 11 },
  { part: "upper arms", cx: 50, cy: 90, rx: 6, ry: 15 },
  { part: "upper arms", cx: 110, cy: 90, rx: 6, ry: 15 },
  { part: "lower arms", cx: 47, cy: 130, rx: 5, ry: 14 },
  { part: "lower arms", cx: 113, cy: 130, rx: 5, ry: 14 },
  { part: "waist", cx: 80, cy: 108, rx: 13, ry: 20 },
  { part: "upper legs", cx: 70, cy: 188, rx: 9, ry: 25 },
  { part: "upper legs", cx: 90, cy: 188, rx: 9, ry: 25 },
  { part: "lower legs", cx: 71, cy: 248, rx: 8, ry: 19 },
  { part: "lower legs", cx: 89, cy: 248, rx: 8, ry: 19 },
];

/** 后侧肌群（cx 以 240 为中线） */
const BACK: Region[] = [
  { part: "shoulders", cx: 220, cy: 66, rx: 9, ry: 7 },
  { part: "shoulders", cx: 260, cy: 66, rx: 9, ry: 7 },
  { part: "back", cx: 240, cy: 72, rx: 22, ry: 10 },
  { part: "back", cx: 240, cy: 98, rx: 18, ry: 16 },
  { part: "upper arms", cx: 210, cy: 90, rx: 6, ry: 15 },
  { part: "upper arms", cx: 270, cy: 90, rx: 6, ry: 15 },
  { part: "lower arms", cx: 207, cy: 130, rx: 5, ry: 14 },
  { part: "lower arms", cx: 273, cy: 130, rx: 5, ry: 14 },
  { part: "waist", cx: 240, cy: 128, rx: 12, ry: 9 },
  { part: "upper legs", cx: 228, cy: 152, rx: 10, ry: 9 },
  { part: "upper legs", cx: 252, cy: 152, rx: 10, ry: 9 },
  { part: "upper legs", cx: 229, cy: 190, rx: 9, ry: 22 },
  { part: "upper legs", cx: 251, cy: 190, rx: 9, ry: 22 },
  { part: "lower legs", cx: 231, cy: 250, rx: 8, ry: 19 },
  { part: "lower legs", cx: 249, cy: 250, rx: 8, ry: 19 },
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

function Muscles({ regions, onPick }: { regions: Region[]; onPick: (p: string) => void }) {
  return (
    <g>
      {regions.map((r, i) => (
        <ellipse
          key={r.part + i}
          cx={r.cx}
          cy={r.cy}
          rx={r.rx}
          ry={r.ry}
          fill="var(--accent)"
          fillOpacity={0.28}
          stroke="var(--accent)"
          strokeOpacity={0.55}
          strokeWidth={1}
          onClick={() => onPick(r.part)}
          className="cursor-pointer"
        />
      ))}
    </g>
  );
}

export function BodyMap({ onPick }: { onPick: (part: string) => void }) {
  const parts = Array.from(new Set([...FRONT, ...BACK].map((r) => r.part)));
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <svg viewBox="0 0 320 300" className="w-full">
        <Silhouette cx={80} />
        <Muscles regions={FRONT} onPick={onPick} />
        <Silhouette cx={240} />
        <Muscles regions={BACK} onPick={onPick} />
        <text x={80} y={292} textAnchor="middle" fill="var(--muted)" fontSize="11">前面</text>
        <text x={240} y={292} textAnchor="middle" fill="var(--muted)" fontSize="11">背面</text>
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {parts.map((p) => (
          <Chip key={p} onClick={() => onPick(p)}>
            {BODY_PART_ZH[p] ?? p}
          </Chip>
        ))}
      </div>
      <p className="mt-2 text-center text-[12px] text-muted">点肌肉筛选动作，常用动作排在最前</p>
    </div>
  );
}
