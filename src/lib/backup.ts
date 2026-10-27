import { db, localDate, uid, type Exercise, type Session, type SetLog } from "./db";

const stamp = () => new Date().toISOString().slice(0, 10);

export function download(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function dumpAll() {
  return {
    app: "ironlog" as const,
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      exercises: await db.exercises.toArray(),
      routines: await db.routines.toArray(),
      programs: await db.programs.toArray(),
      sessions: await db.sessions.toArray(),
      metrics: await db.metrics.toArray(),
      settings: await db.settings.toArray(),
    },
  };
}

export async function exportJSON() {
  const dump = await dumpAll();
  download(JSON.stringify(dump, null, 2), "lian-" + stamp() + ".json", "application/json");
  await db.settings.update("app", { lastExportAt: Date.now(), backupSnoozeUntil: undefined });
}

type Dump = Awaited<ReturnType<typeof dumpAll>>;

export async function importJSON(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<Dump>;
  const app = (parsed as { app?: string }).app;
  if ((app !== "ironlog" && app !== "lian") || !parsed.data) throw new Error("不是「练」的备份文件");
  const d = parsed.data;

  await db.exercises.clear();
  await db.routines.clear();
  await db.programs.clear();
  await db.sessions.clear();
  await db.metrics.clear();
  await db.settings.clear();

  if (d.exercises?.length) await db.exercises.bulkPut(d.exercises);
  if (d.routines?.length) await db.routines.bulkPut(d.routines);
  if (d.programs?.length) await db.programs.bulkPut(d.programs);
  if (d.sessions?.length) await db.sessions.bulkPut(d.sessions);
  if (d.metrics?.length) await db.metrics.bulkPut(d.metrics);
  if (d.settings?.length) await db.settings.bulkPut(d.settings);
}

// ---------------------------------------------------------------- CSV

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export async function exportCSV() {
  const [sessions, exercises, routines] = await Promise.all([
    db.sessions.toArray(),
    db.exercises.toArray(),
    db.routines.toArray(),
  ]);
  const ex = new Map(exercises.map((e) => [e.id, e]));
  const rt = new Map(routines.map((r) => [r.id, r]));
  const rows: string[][] = [["Date", "Workout Name", "Exercise Name", "Set Order", "Weight", "Reps", "Notes"]];
  for (const s of sessions.sort((a, b) => a.startedAt - b.startedAt)) {
    const workout = rt.get(s.routineId)?.name ?? "训练";
    const firstSeen = new Map<string, number>();
    s.logs.forEach((l, i) => {
      if (!firstSeen.has(l.exerciseId)) firstSeen.set(l.exerciseId, i);
    });
    const ordered = [...s.logs].sort(
      (a, b) => (firstSeen.get(a.exerciseId) ?? 0) - (firstSeen.get(b.exerciseId) ?? 0) || a.setNo - b.setNo,
    );
    for (const l of ordered) {
      rows.push([
        s.date,
        workout,
        ex.get(l.exerciseId)?.name ?? l.exerciseId,
        String(l.setNo),
        String(l.weight),
        String(l.reps),
        l.rpe ? "RPE " + l.rpe : "",
      ]);
    }
  }
  download(rows.map((r) => r.map(esc).join(",")).join("\n"), "ironlog-" + stamp() + ".csv", "text/csv;charset=utf-8");
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c !== "\r") cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type CsvMap = "fitnotes" | "strong";

const normalizeDate = (raw: string) => {
  const s = raw.trim().replace(/\//g, "-");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
  return localDate();
};

export async function importCSV(file: File, map: CsvMap) {
  const rows = parseCSV(await file.text());
  if (rows.length < 2) throw new Error("CSV 没有数据行");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const at = (cands: string[]) => {
    for (const c of cands) {
      const i = header.indexOf(c);
      if (i >= 0) return i;
    }
    return -1;
  };

  const f =
    map === "fitnotes"
      ? {
          date: at(["date"]),
          workout: -1,
          exercise: at(["exercise"]),
          setNo: -1,
          kg: at(["weight (kg)"]),
          lbs: at(["weight (lbs)"]),
          reps: at(["reps"]),
        }
      : {
          date: at(["date"]),
          workout: at(["workout name"]),
          exercise: at(["exercise name", "exercise"]),
          setNo: at(["set order"]),
          kg: at(["weight"]),
          lbs: -1,
          reps: at(["reps"]),
        };

  if (f.date < 0 || f.exercise < 0 || f.reps < 0 || (f.kg < 0 && f.lbs < 0)) {
    throw new Error("列不匹配：至少需要 Date / Exercise / Weight / Reps");
  }

  const exercises = await db.exercises.toArray();
  const byName = new Map<string, Exercise>();
  exercises.forEach((e) => {
    byName.set(e.name.trim().toLowerCase(), e);
    if (e.zh) byName.set(e.zh.trim().toLowerCase(), e);
  });

  const groups = new Map<string, { date: string; workout: string; logs: SetLog[]; seq: Map<string, number> }>();
  let sets = 0;
  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");

  for (const r of rows.slice(1)) {
    const name = cell(r, f.exercise);
    if (!name) continue;
    const rawKg = cell(r, f.kg);
    const rawLbs = cell(r, f.lbs);
    const weight = rawKg ? Number(rawKg) : rawLbs ? Math.round(Number(rawLbs) * 0.4536 * 2) / 2 : 0;
    const reps = Number(cell(r, f.reps)) || 0;
    if (!weight && !reps) continue;

    const date = normalizeDate(cell(r, f.date));
    const workout = cell(r, f.workout) || "导入";
    const key = date + "|" + workout;

    let ex = byName.get(name.toLowerCase());
    if (!ex) {
      ex = {
        id: "c-" + uid(),
        name,
        bodyPart: "waist",
        equipment: "custom",
        target: "",
        secondary: [],
        isCustom: true,
      };
      await db.exercises.put(ex);
      byName.set(name.toLowerCase(), ex);
    }

    const g = groups.get(key) ?? { date, workout, logs: [], seq: new Map<string, number>() };
    const next = (g.seq.get(ex.id) ?? 0) + 1;
    g.seq.set(ex.id, next);
    g.logs.push({
      exerciseId: ex.id,
      setNo: f.setNo >= 0 ? Number(cell(r, f.setNo)) || next : next,
      weight,
      reps,
      doneAt: new Date(date + "T09:00:00").getTime(),
    });
    groups.set(key, g);
    sets++;
  }

  const routines = await db.routines.toArray();
  const routineByName = new Map(routines.map((r) => [r.name.trim().toLowerCase(), r]));
  const sessions = await db.sessions.toArray();

  let created = 0;
  for (const g of groups.values()) {
    let routine = routineByName.get(g.workout.toLowerCase());
    if (!routine) {
      const id = "r-" + uid();
      const exerciseIds = [...new Set(g.logs.map((l) => l.exerciseId))];
      routine = {
        id,
        name: g.workout,
        blocks: exerciseIds.map((exerciseId) => ({
          type: "single" as const,
          exercises: [{ exerciseId, sets: g.logs.filter((l) => l.exerciseId === exerciseId).length, reps: "8-12", restSec: 90 }],
        })),
      };
      await db.routines.put(routine);
      routineByName.set(routine.name.toLowerCase(), routine);
    }

    const existing = sessions.find((s) => s.date === g.date && s.routineId === routine!.id);
    if (existing) {
      const dup = (l: SetLog) =>
        existing.logs.some((x) => x.exerciseId === l.exerciseId && x.setNo === l.setNo && x.weight === l.weight);
      const merged: Session = { ...existing, logs: [...existing.logs, ...g.logs.filter((l) => !dup(l)), ] };
      await db.sessions.put(merged);
    } else {
      const session: Session = {
        id: uid(),
        routineId: routine.id,
        date: g.date,
        startedAt: new Date(g.date + "T09:00:00").getTime(),
        endedAt: new Date(g.date + "T10:00:00").getTime(),
        logs: g.logs,
      };
      await db.sessions.put(session);
      created++;
    }
  }

  return { sets, sessions: Math.max(created, groups.size) };
}

export async function clearAll() {
  await db.delete();
}
