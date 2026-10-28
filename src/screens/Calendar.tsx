import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, localDate, type Settings } from "../lib/db";
import { plannedSets } from "../lib/session";
import { Btn, Empty, Sheet, TextInput } from "../components/ui";

const DOW = ["一", "二", "三", "四", "五", "六", "日"];

function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) {
    cells.push(year + "-" + String(month + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"));
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

const normalize = (raw: Record<string, string[] | string>): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = Array.isArray(v) ? v : [v];
  return out;
};

export function CalendarScreen() {
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const routines = useLiveQuery(() => db.routines.toArray(), []);
  const today = localDate();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [picked, setPicked] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const schedule = normalize((settings?.schedule ?? {}) as Record<string, string[] | string>);
  const weekly = settings?.weeklySchedule ?? {};
  const cells = monthGrid(cursor.y, cursor.m);
  const byId = new Map((routines ?? []).map((r) => [r.id, r]));

  useEffect(() => {
    if (picked) setSel(schedule[picked] ?? []);
  }, [picked]);

  const openDay = (date: string) => {
    setQ("");
    setPicked(date);
  };

  const saveDay = async () => {
    if (!picked) return;
    const next = { ...schedule };
    if (sel.length) next[picked] = sel;
    else delete next[picked];
    const patch: Partial<Settings> = { schedule: next };
    await db.settings.update("app", patch);
    setPicked(null);
  };

  const toggle = (id: string) => setSel((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

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
        <div className="text-sm font-semibold">{cursor.y} 年 {cursor.m + 1} 月</div>
        <button onClick={() => shift(1)} className="px-2 text-muted">›</button>
      </div>

      <div className="rounded-3xl border border-line bg-surface p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
          {DOW.map((d) => (<div key={d} className="py-1">{d}</div>))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={"e" + i} />;
            const dow = String(((new Date(date + "T00:00:00").getDay() + 6) % 7) + 1);
            const count = (schedule[date] ?? []).length;
            const hasWeekly = !!weekly[dow];
            const isToday = date === today;
            return (
              <button
                key={date}
                onClick={() => openDay(date)}
                className={
                  "flex aspect-square flex-col items-center justify-center rounded-xl text-[12px] " +
                  (isToday ? "bg-accent text-onaccent" : count ? "bg-accent/10 text-accent" : "")
                }
              >
                <span className="tabular-nums">{Number(date.slice(8))}</span>
                <span className="mt-0.5 flex items-center gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }, (_, k) => (
                    <i key={k} className="block h-1 w-1 rounded-full bg-current opacity-80" />
                  ))}
                  {hasWeekly && <i className="block h-1 w-1 rounded-full border border-current opacity-50" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted">实心点 = 当天安排（可多个），空心点 = 每周固定</p>
      </div>

      {!!Object.keys(schedule).length && (
        <div className="rounded-3xl border border-line bg-surface p-3">
          <div className="text-[12px] font-medium">接下来</div>
          <div className="mt-1.5 space-y-1">
            {Object.entries(schedule)
              .filter(([d]) => d >= today)
              .sort()
              .slice(0, 5)
              .map(([d, ids]) => (
                <div key={d} className="flex items-center justify-between text-[12px]">
                  <span className="text-muted tabular-nums">{d.slice(5).replace("-", "/")}</span>
                  <span className="truncate pl-2">{ids.map((id) => byId.get(id)?.name ?? "—").join(" + ")}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <Sheet
        open={!!picked}
        onClose={() => setPicked(null)}
        title={picked ? picked.slice(5).replace("-", " 月 ") + " 日" : ""}
        size="full"
        footer={
          <div className="space-y-2">
            <Btn onClick={() => void saveDay()}>保存（已选 {sel.length} 个）</Btn>
            <button
              onClick={() => {
                setSel([]);
                if (picked) {
                  const next = { ...schedule };
                  delete next[picked];
                  void db.settings.update("app", { schedule: next } as Partial<Settings>);
                }
                setPicked(null);
              }}
              className="w-full py-1.5 text-[12px] text-muted"
            >
              清除这天安排
            </button>
          </div>
        }
      >
        <TextInput value={q} onChange={setQ} placeholder="搜索例程" />
        <div className="mt-2 space-y-1 pb-2">
          {list.map((r) => {
            const on = sel.includes(r.id);
            return (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                className={
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left " +
                  (on ? "bg-accent/12 text-accent" : "bg-surface2 text-ink")
                }
              >
                <span className="text-sm">{on ? "✓ " : ""}{r.name}</span>
                <span className="text-[11px] text-muted tabular-nums">{plannedSets(r)} 组</span>
              </button>
            );
          })}
          {!list.length && <Empty text="没有匹配的例程" />}
        </div>
      </Sheet>
    </div>
  );
}
