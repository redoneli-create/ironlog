import { useLiveQuery } from "dexie-react-hooks";
import { BODY_PART_ZH, db, localDate } from "../lib/db";
import { bodyPartSets, weeklyStats } from "../lib/metrics";
import { estimateKcal, latestWeight } from "../lib/calories";
import { Card, Empty } from "../components/ui";

const px = (v: number) => Math.round(v);

export function StatsScreen() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const metrics = useLiveQuery(() => db.metrics.toArray(), []);
  const done = (sessions ?? []).filter((s) => s.endedAt);
  const weeks = weeklyStats(done, 12, localDate());
  const thisWeek = weeks[weeks.length - 1];
  const maxWeek = Math.max(...weeks.map((w) => w.volume), 1);
  const weekKey = weeks[weeks.length - 1].start;
  const weekSessions = done.filter((s) => weekKey === weeklyStats([s], 1, s.date)[0].start);
  const weekKcal = weekSessions.reduce((n, s) => n + estimateKcal(s, exercises ?? [], latestWeight(metrics ?? [])), 0);
  const parts = bodyPartSets(done, exercises ?? [], 28, localDate());
  const totalPartSets = parts.reduce((n, p) => n + p.sets, 0) || 1;

  return (
    <div className="space-y-3">
      <Card>
        <div className="text-[12px] text-muted">本周（周一起）</div>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-3xl font-semibold tabular-nums">{thisWeek.sessions}</span>
          <span className="pb-1 text-xs text-muted">次训练</span>
        </div>
        <div className="mt-2 flex gap-2 text-[12px] text-muted">
          <span>{thisWeek.sets} 组</span>
          <span>·</span>
          <span>{Math.round(thisWeek.volume)} kg 容量</span>
          <span>·</span>
          <span>≈ {weekKcal} kcal</span>
        </div>
      </Card>

      <Card>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">近 12 周容量</h3>
          <span className="text-[12px] text-muted">kg</span>
        </div>
        <div className="mt-3 flex h-24 items-end gap-1">
          {weeks.map((w) => (
            <div key={w.start} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-accent/80"
                style={{ height: px((w.volume / maxWeek) * 84) + "px" }}
                title={w.start + " · " + Math.round(w.volume) + " kg"}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[12px] text-muted">
          <span>{weeks[0].start.slice(5)}</span>
          <span>本周</span>
        </div>
      </Card>

      <Card>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">近 4 周部位组数</h3>
          <span className="text-[12px] text-muted">{totalPartSets} 组</span>
        </div>
        <div className="mt-3 space-y-2">
          {parts.map((p) => (
            <div key={p.part}>
              <div className="flex justify-between text-[12px]">
                <span>{BODY_PART_ZH[p.part] ?? p.part}</span>
                <span className="text-muted tabular-nums">{p.sets}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: Math.round((p.sets / totalPartSets) * 100) + "%" }}
                />
              </div>
            </div>
          ))}
          {!parts.length && <Empty text="还没有训练数据" />}
        </div>
      </Card>
    </div>
  );
}
