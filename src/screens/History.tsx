import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, exerciseLabel, type Session } from "../lib/db";
import { epley, prByExercise, sessionStats } from "../lib/metrics";
import { toast } from "../lib/toast";
import { Card, Empty, Sheet } from "../components/ui";

const monthLabel = (d: string) => d.slice(0, 4) + " 年 " + Number(d.slice(5, 7)) + " 月";

function SessionDetail({ session, onClose }: { session: Session; onClose: () => void }) {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const routine = useLiveQuery(() => db.routines.get(session.routineId), [session.routineId]);
  const exMap = new Map((exercises ?? []).map((e) => [e.id, e]));
  const pr = prByExercise(sessions ?? []);
  const stats = sessionStats(session);

  const ids = [...new Set(session.logs.map((l) => l.exerciseId))];
  const groups = ids.map((id) => ({
    id,
    logs: session.logs.filter((l) => l.exerciseId === id).sort((a, b) => a.setNo - b.setNo),
  }));
  const isPr = (weight: number, reps: number, id: string) =>
    weight > 0 && epley(weight, reps) >= (pr.get(id) ?? 0) - 0.05;
  const prCount = session.logs.filter((l) => isPr(l.weight, l.reps, l.exerciseId)).length;

  const remove = async () => {
    await db.sessions.delete(session.id);
    onClose();
    toast("已删除该次训练", "撤销", () => void db.sessions.put(session));
  };

  return (
    <Sheet open onClose={onClose} title={(routine?.name ?? "训练") + " · " + session.date}>
      <div className="flex gap-2 text-[11px] text-muted">
        <span>{stats.sets} 组</span>
        <span>·</span>
        <span>{stats.volume} kg</span>
        <span>·</span>
        <span>{stats.minutes} 分钟</span>
        {prCount > 0 && <span className="text-accent">· {prCount} 个纪录</span>}
      </div>

      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <div key={g.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm">{exerciseLabel(exMap.get(g.id))}</span>
              <span className="text-[11px] text-muted">{g.logs.length} 组</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {g.logs.map((l) => {
                const best = isPr(l.weight, l.reps, l.exerciseId);
                return (
                  <span
                    key={l.setNo}
                    className={
                      "rounded-md px-2 py-1 text-[11px] tabular-nums " +
                      (best ? "bg-accent/15 text-accent" : "bg-surface2 text-ink")
                    }
                  >
                    {l.weight}×{l.reps}
                    {best ? " PR" : ""}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => void remove()} className="mt-4 w-full py-2 text-xs text-muted">
        删除这次训练
      </button>
    </Sheet>
  );
}

export function HistoryScreen() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const routines = useLiveQuery(() => db.routines.toArray(), []);
  const [openId, setOpenId] = useState<string | null>(null);

  const routineMap = new Map((routines ?? []).map((r) => [r.id, r]));
  const done = (sessions ?? [])
    .filter((s) => s.endedAt)
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));

  const groups: { month: string; items: Session[] }[] = [];
  for (const s of done) {
    const month = monthLabel(s.date);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(s);
    else groups.push({ month, items: [s] });
  }

  const open = done.find((s) => s.id === openId);

  return (
    <div className="space-y-3">
      <div className="px-1 text-[11px] text-muted">共 {done.length} 次训练</div>

      {groups.map((g) => (
        <div key={g.month}>
          <div className="mb-1 px-1 text-[11px] text-muted">{g.month}</div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            {g.items.map((s) => {
              const stats = sessionStats(s);
              return (
                <button
                  key={s.id}
                  onClick={() => setOpenId(s.id)}
                  className="flex w-full items-center justify-between border-b border-line px-3 py-3 text-left last:border-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm">{routineMap.get(s.routineId)?.name ?? "自由训练"}</div>
                    <div className="text-[11px] text-muted tabular-nums">
                      {s.date} · {stats.sets} 组 · {stats.volume} kg · {stats.minutes} 分
                    </div>
                  </div>
                  <span className="pl-2 text-muted">›</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!done.length && (
        <Card>
          <Empty text="还没有训练记录，去「训练」开始第一次" />
        </Card>
      )}

      {open && <SessionDetail session={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
