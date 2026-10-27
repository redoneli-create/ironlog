import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, localDate, type Settings } from "../lib/db";
import { plannedSets } from "../lib/session";
import { Sheet, TextInput, Empty } from "../components/ui";

const DOW = ["一", "二", "三", "四", "五", "六", "日"];

function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) {
    const m = String(month + 1).padStart(2, "0");
    cells.push(year + "-" + m + "-" + String(d).padStart(2, "0"));
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function CalendarScreen() {
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const routines = useLiveQuery(() => db.routines.toArray(), []);
  const today = localDate();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [picked, setPicked] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const schedule = settings?.schedule ?? {};
  const weekly = settings?.weeklySchedule ?? {};
  const cells = monthGrid(cursor.y, cursor.m);
  const byId = new Map((routines ?? []).map((r) => [r.id, r]));

  const assign = async (date: string, routineId: string | null, alsoWeekly: boolean) => {
    const next = { ...schedule };
    if (routineId) next[date] = routineId;
    else delete next[date];
    const patch: Partial<Settings> = { schedule: next };
    if (alsoWeekly) {
      const dow = String(((new Date(date + "T00:00:00").getDay() + 6) % 7) + 1);
      const w = { ...weekly };
      if (routineId) w[dow] = routineId;
      else delete w[dow];
      patch.weeklySchedule = w;
    }
    await db.settings.update("app", patch);
    setPicked(null);
  };

  const shift = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const list = (routines ?? [])
    .filter((r) => !q.trim() || r.name.includes(q.trim()))
    .sort((a, b) => Number(!!a.official) - Number(!!b.official) || a.name.localeCompare(b.name, "zh"));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-3xl border border-line bg-surface px-4 py-3">
        <button onClick={() => shift(-1)} className="px-2 text-muted">‹</button>
        <div className="text-sm font-semibold">
          {cursor.y} 年 {cursor.m + 1} 月
        </div>
        <button onClick={() => shift(1)} className="px-2 text-muted">›</button>
      </div>

      <div className="rounded-3xl border border-line bg-surface p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
          {DOW.map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={"e" + i} />;
            const dow = String(((new Date(date + "T00:00:00").getDay() + 6) % 7) + 1);
            const hasDate = !!schedule[date];
            const hasWeekly = !!weekly[dow];
            const isToday = date === today;
            return (
              <button
                key={date}
                onClick={() => setPicked(date)}
                className={
                  "flex aspect-square flex-col items-center justify-center rounded-xl text-[12px] " +
                  (isToday ? "bg-accent text-onaccent" : hasDate ? "bg-accent/10 text-accent" : "hover:bg-surface2")
                }
              >
                <span className="tabular-nums">{Number(date.slice(8))}</span>
                <span className="mt-0.5 flex gap-0.5">
                  {hasDate && <i className="block h-1 w-1 rounded-full bg-current opacity-80" />}
                  {hasWeekly && <i className="block h-1 w-1 rounded-full border border-current opacity-50" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted">实心点 = 当天安排，空心点 = 每周固定</p>
      </div>

      {!!Object.keys(schedule).length && (
        <div className="rounded-3xl border border-line bg-surface p-3">
          <div className="text-[12px] font-medium">接下来</div>
          <div className="mt-1.5 space-y-1">
            {Object.entries(schedule)
              .filter(([d]) => d >= today)
              .sort()
              .slice(0, 5)
              .map(([d, rid]) => (
                <div key={d} className="flex items-center justify-between text-[12px]">
                  <span className="text-muted tabular-nums">{d.slice(5).replace("-", "/")}</span>
                  <span>{byId.get(rid)?.name ?? "未命名"}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <Sheet
        open={!!picked}
        onClose={() => setPicked(null)}
        title={picked ? picked.slice(5).replace("-", " 月 ") + " 日" : ""}
        footer={
          picked ? (
            <button
              onClick={() => void assign(picked, null, true)}
              className="w-full rounded-xl border border-line py-3 text-sm text-muted"
            >
              清除这天与每周安排
            </button>
          ) : null
        }
      >
        <TextInput value={q} onChange={setQ} placeholder="搜索例程" />
        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
          {list.map((r) => (
            <button
              key={r.id}
              onClick={() => picked && void assign(picked, r.id, false)}
              className="flex w-full items-center justify-between rounded-xl bg-surface2 px-3 py-2.5 text-left"
            >
              <span className="text-sm">{r.name}</span>
              <span className="text-[11px] text-muted tabular-nums">{plannedSets(r)} 组</span>
            </button>
          ))}
          {!list.length && <Empty text="没有匹配的例程" />}
        </div>
        <button
          onClick={() => picked && list[0] && void assign(picked, list[0].id, true)}
          className="mt-2 w-full rounded-xl border border-line py-2.5 text-[12px] text-muted"
        >
          设为「每周这天」固定（用第一个结果）
        </button>
      </Sheet>
    </div>
  );
}

export const calendarHelpers = { monthGrid, DOW };
