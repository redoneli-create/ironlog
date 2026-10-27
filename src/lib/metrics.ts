import { localDate, type Exercise, type Session, type SetLog } from "./db";

export const epley = (weight: number, reps: number) =>
  reps <= 1 ? Math.round(weight * 10) / 10 : Math.round(weight * (1 + reps / 30) * 10) / 10;

export const roundTo = (value: number, step = 2.5) => Math.round(value / step) * step;

export const topRep = (reps: string) => {
  const nums = reps.match(/\d+/g);
  return nums ? Number(nums[nums.length - 1]) : 8;
};

export interface Ghost {
  weight: number;
  reps: number;
  date: string;
  sessionId: string;
}

/** 最近一次含该动作的训练，取最大重量那一组。 */
export function ghostsOf(sessions: Session[]): Map<string, Ghost> {
  const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  const out = new Map<string, Ghost>();
  for (const s of sorted) {
    const perExercise = new Map<string, SetLog>();
    for (const l of s.logs) {
      const cur = perExercise.get(l.exerciseId);
      if (!cur || l.weight > cur.weight || (l.weight === cur.weight && l.reps > cur.reps)) {
        perExercise.set(l.exerciseId, l);
      }
    }
    perExercise.forEach((l, exerciseId) => {
      if (!out.has(exerciseId)) {
        out.set(exerciseId, { weight: l.weight, reps: l.reps, date: s.date, sessionId: s.id });
      }
    });
  }
  return out;
}

export interface Suggestion {
  weight: number;
  reps: number;
  reason: string;
}

export function suggestNext(ghost: Ghost | undefined, reps: string, step = 2.5): Suggestion | null {
  if (!ghost || ghost.weight <= 0) return null;
  const target = topRep(reps);
  if (ghost.reps >= target) {
    return { weight: roundTo(ghost.weight + step, step), reps: target, reason: "上次达标 → 加重" };
  }
  return { weight: ghost.weight, reps: ghost.reps + 1, reason: "上次未满 → 补次数" };
}

export const daysBetween = (a: string, b: string) =>
  Math.max(
    0,
    Math.round(
      (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000,
    ),
  );

export function homeSignal(sessions: Session[], today: string): { title: string; detail: string } {
  const done = sessions.filter((s) => s.endedAt).sort((a, b) => b.startedAt - a.startedAt);
  if (!done.length) return { title: "开始第一次训练", detail: "选修例程，记下 3 组也算开张" };
  const last = done[0];
  const gap = daysBetween(last.date, today);
  const volume = last.logs.reduce((v, l) => v + l.weight * l.reps, 0);
  if (gap >= 4) return { title: "该练了", detail: "上次是 " + last.date + "，间隔 " + gap + " 天" };
  if (gap === 0) return { title: "今天已练", detail: "累计 " + Math.round(volume) + "kg 容量，注意恢复" };
  if (gap === 1) return { title: "恢复优先", detail: "昨天刚练 " + Math.round(volume) + "kg 容量，今天可轻量或休息" };
  return { title: "保持节奏", detail: "距上次 " + gap + " 天，按计划继续" };
}

export const setE1rm = (weight: number, reps: number) => epley(weight, reps);

/** 每个动作的历史最佳 e1RM。 */
export function prByExercise(sessions: Session[]): Map<string, number> {
  const pr = new Map<string, number>();
  for (const s of sessions) {
    for (const l of s.logs) {
      if (l.weight <= 0) continue;
      const v = epley(l.weight, l.reps);
      if (v > (pr.get(l.exerciseId) ?? 0)) pr.set(l.exerciseId, v);
    }
  }
  return pr;
}

export function sessionStats(s: Session) {
  const volume = s.logs.reduce((v, l) => v + l.weight * l.reps, 0);
  return {
    sets: s.logs.length,
    volume: Math.round(volume),
    minutes: s.endedAt ? Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000)) : 0,
  };
}

/** 所在周的周一（YYYY-MM-DD） */
export function weekStart(date: string): string {
  const d = new Date(date + "T00:00:00");
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return localDate(d);
}

export interface WeekStat {
  start: string;
  sessions: number;
  volume: number;
  sets: number;
}

export function weeklyStats(sessions: Session[], weeks = 12, today = localDate()): WeekStat[] {
  const current = weekStart(today);
  const keys: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(current + "T00:00:00");
    d.setDate(d.getDate() - i * 7);
    keys.push(localDate(d));
  }
  const map = new Map(keys.map((k) => [k, { start: k, sessions: 0, volume: 0, sets: 0 }]));
  for (const s of sessions) {
    if (!s.endedAt) continue;
    const row = map.get(weekStart(s.date));
    if (!row) continue;
    row.sessions += 1;
    row.sets += s.logs.length;
    row.volume += s.logs.reduce((v, l) => v + l.weight * l.reps, 0);
  }
  return keys.map((k) => map.get(k)!);
}

export interface PartStat {
  part: string;
  sets: number;
}

export function bodyPartSets(
  sessions: Session[],
  exercises: Exercise[],
  days = 28,
  today = localDate(),
): PartStat[] {
  const since = new Date(today + "T00:00:00");
  since.setDate(since.getDate() - days);
  const sinceStr = localDate(since);
  const partOf = new Map(exercises.map((e) => [e.id, e.bodyPart]));
  const out = new Map<string, number>();
  for (const s of sessions) {
    if (!s.endedAt || s.date < sinceStr) continue;
    for (const l of s.logs) {
      const part = partOf.get(l.exerciseId) ?? "other";
      out.set(part, (out.get(part) ?? 0) + 1);
    }
  }
  return [...out.entries()]
    .map(([part, sets]) => ({ part, sets }))
    .sort((a, b) => b.sets - a.sets);
}
