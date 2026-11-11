import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  equipmentZh,
  exerciseLabel,
  localDate,
  type Exercise,
  type Routine,
  type RoutineExercise,
  type Session,
  type SetLog,
} from "../lib/db";
import {
  activeSession,
  discardSession,
  finishSession,
  isDone,
  plannedSets,
  sessionVolume,
  startSession,
  toggleSet,
} from "../lib/session";
import { epley, ghostsOf, homeSignal, suggestNext } from "../lib/metrics";
import { pushBack } from "../lib/backstack";
import { FollowAlong } from "./FollowAlong";
import { TipsPage } from "./TipsPage";
import { QuickGrid } from "../components/QuickGrid";
import { cycleInfo, PHASE_LABEL, PHASE_TIP } from "../lib/cycle";
import { startRest, stopRest } from "../lib/rest";
import { keepScreenOn } from "../lib/keepAwake";
import { ensureNotifyPermission } from "../lib/notify";
import { exportJSON } from "../lib/backup";
import { estimateKcal, latestWeight } from "../lib/calories";
import { toast } from "../lib/toast";
import { Card, Sheet } from "../components/ui";
import { RestBar } from "../components/RestBar";
import { Icon } from "../components/Icons";
import { TutorialList } from "../components/Tutorials";

const REST_STEPS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

const dur = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
};

const firstRep = (reps: string) => (reps.match(/\d+/) ?? ["0"])[0];

function SetRow(props: {
  slot: RoutineExercise;
  setNo: number;
  log?: SetLog;
  ghost?: { weight: number; reps: number };
  unit: string;
  onToggle: (weight: number, reps: number) => void;
}) {
  const [w, setW] = useState(
    props.log
      ? String(props.log.weight)
      : props.ghost
        ? String(props.ghost.weight)
        : props.slot.weight
          ? String(props.slot.weight)
          : "",
  );
  const [r, setR] = useState(
    props.log ? String(props.log.reps) : props.ghost ? String(props.ghost.reps) : firstRep(props.slot.reps),
  );
  const done = !!props.log;

  return (
    <div className="flex items-center gap-2">
      <span className={"w-5 text-xs tabular-nums " + (done ? "text-accent" : "text-muted")}>{props.setNo}</span>
      <div className="relative flex-1">
        <input
          inputMode="decimal"
          value={w}
          onChange={(e) => setW(e.target.value)}
          placeholder="0"
          className="h-12 w-full rounded-xl bg-surface2 pr-8 pl-3 text-base tabular-nums outline-none focus:ring-2 focus:ring-accent/60"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted">
          {props.unit}
        </span>
      </div>
      <div className="relative flex-1">
        <input
          inputMode="numeric"
          value={r}
          onChange={(e) => setR(e.target.value)}
          placeholder="0"
          className="h-12 w-full rounded-xl bg-surface2 pr-8 pl-3 text-base tabular-nums outline-none focus:ring-2 focus:ring-accent/60"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted">
          次
        </span>
      </div>
      <button
        onClick={() => props.onToggle(Number(w) || 0, Number(r) || 0)}
        className={
          "press h-12 w-12 shrink-0 rounded-xl text-lg font-bold " +
          (done ? "bg-accent text-onaccent" : "border border-line bg-surface2 text-muted")
        }
        aria-label="完成该组"
      >
        ✓
      </button>
    </div>
  );
}

function CardioCard(props: {
  slot: RoutineExercise;
  exercise?: Exercise;
  log?: SetLog;
  kg: number;
  onToggle: (minutes: number) => void;
}) {
  const [min, setMin] = useState(String(Math.round((props.slot.durationSec ?? 1200) / 60)));
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const done = !!props.log;
  const kcal = Math.round(((8 * 3.5 * props.kg) / 200) * (Number(min) || 0));

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [startedAt]);

  const toggleTimer = () => {
    if (startedAt) {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setStartedAt(null);
      setElapsed(0);
      if (secs > 0) setMin(String(Math.max(1, Math.round(secs / 60))));
    } else {
      setElapsed(0);
      setStartedAt(Date.now());
    }
  };
  return (
    <div className="rounded-3xl border border-line bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{exerciseLabel(props.exercise)}</div>
          <div className="truncate text-[12px] text-muted">
            {equipmentZh(props.exercise?.equipment)} · 有氧
          </div>
        </div>
        <span className="shrink-0 text-[12px] text-muted tabular-nums">约 {kcal} kcal</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={toggleTimer}
          className={
            "press h-12 rounded-xl px-3 text-[12px] font-medium " +
            (startedAt ? "bg-accent/15 text-accent" : "bg-surface2 text-muted")
          }
        >
          {startedAt ? String(Math.floor(elapsed / 60)).padStart(2, "0") + ":" + String(elapsed % 60).padStart(2, "0") : "计时"}
        </button>
        <input
          inputMode="numeric"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          className="h-12 w-20 rounded-xl bg-surface2 px-3 text-center text-base tabular-nums outline-none focus:ring-2 focus:ring-accent/50"
        />
        <span className="text-[12px] text-muted">分钟</span>
        <button
          onClick={() => props.onToggle(Number(min) || 0)}
          className={
            "press ml-auto h-12 rounded-xl px-5 text-sm font-semibold " +
            (done ? "bg-accent/15 text-accent" : "bg-accent text-onaccent")
          }
        >
          {done ? "已完成" : "完成"}
        </button>
      </div>
    </div>
  );
}

function ExerciseCard(props: {
  slot: RoutineExercise;
  exercise?: Exercise;
  logs: SetLog[];
  ghost?: { weight: number; reps: number };
  restSec: number;
  unit: string;
  onToggle: (setNo: number, weight: number, reps: number) => void;
  onCycleRest: () => void;
  onTutorial: () => void;
}) {
  const done = props.logs.length;
  const sug = suggestNext(props.ghost ? { ...props.ghost, date: "", sessionId: "" } : undefined, props.slot.reps);
  const best = props.logs.length
    ? Math.max(...props.logs.map((l) => epley(l.weight, l.reps)))
    : props.ghost
      ? epley(props.ghost.weight, props.ghost.reps)
      : 0;

  return (
    <div className="rounded-3xl border border-line bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{exerciseLabel(props.exercise)}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
            <span className="truncate">
              {equipmentZh(props.exercise?.equipment)}
              {props.slot.tempo ? " · 节奏 " + props.slot.tempo : ""}
            </span>
            {!!props.exercise?.links?.length && (
              <button
                onClick={props.onTutorial}
                className="press shrink-0 rounded-md border border-accent/40 px-1.5 py-0.5 text-[12px] text-accent"
              >
                教程 {props.exercise.links.length}
              </button>
            )}
          </div>
        </div>
        <button onClick={props.onCycleRest} className="press shrink-0 rounded-lg bg-surface2 px-2 py-1 text-[12px] text-muted">
          {props.slot.sets} 组 × {props.slot.reps}
          {props.slot.weight ? " · " + props.slot.weight + "kg" : ""} · 休 {props.restSec}s
        </button>
      </div>

      {(props.ghost || sug) && (
        <div className="mt-1 text-[12px]">
          {props.ghost && (
            <span className="text-muted">
              上次 {props.ghost.weight}
              {props.unit} × {props.ghost.reps}
            </span>
          )}
          {!!best && <span className="text-muted"> · e1RM {best}</span>}
          {sug && (
            <span className="text-accent">
              {" "}
              · 建议 {sug.weight}
              {props.unit} × {sug.reps}
            </span>
          )}
        </div>
      )}

      <div className="mt-2 space-y-2">
        {Array.from({ length: props.slot.sets }, (_, i) => {
          const setNo = i + 1;
          return (
            <SetRow
              key={setNo}
              slot={props.slot}
              setNo={setNo}
              log={props.logs.find((l) => l.setNo === setNo)}
              ghost={props.ghost}
              unit={props.unit}
              onToggle={(w, r) => props.onToggle(setNo, w, r)}
            />
          );
        })}
      </div>
      {done > 0 && (
        <div className="mt-2 text-[12px] text-muted tabular-nums">
          已完成 {done}/{props.slot.sets}
        </div>
      )}
    </div>
  );
}

function Workout(props: { session: Session }) {
  const { session } = props;
  const routine = useLiveQuery(() => db.routines.get(session.routineId), [session.routineId]);
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const metrics = useLiveQuery(() => db.metrics.toArray(), []);
  const ghosts = ghostsOf((sessions ?? []).filter((s) => s.id !== session.id));

  const ids = routine ? [...new Set(routine.blocks.flatMap((b) => b.exercises.map((e) => e.exerciseId)))] : [];
  const exercises = useLiveQuery(
    () =>
      ids.length
        ? db.exercises.bulkGet(ids).then((rows) => rows.filter((e): e is Exercise => !!e))
        : Promise.resolve([] as Exercise[]),
    [routine?.id],
  );
  const byId = new Map((exercises ?? []).map((e) => [e.id, e]));

  const [restOverrides, setRestOverrides] = useState<Record<string, number>>({});
  const [tut, setTut] = useState<Exercise | null>(null);

  useEffect(() => pushBack(() => {
    setSheet(true);
    return true;
  }), []);
  const [now, setNow] = useState(Date.now());
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    keepScreenOn(true);
    return () => {
      clearInterval(t);
      keepScreenOn(false);
    };
  }, []);

  if (!routine) return <div className="p-4 text-sm text-muted">载入中…</div>;

  const unit = settings?.unit ?? "kg";
  const total = plannedSets(routine);
  const done = session.logs.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const restOf = (slot: RoutineExercise) => restOverrides[slot.exerciseId] ?? (slot.restSec || settings?.restDefault || 90);

  const cycleRest = (slot: RoutineExercise) => {
    const cur = restOf(slot);
    const next = REST_STEPS[(REST_STEPS.indexOf(cur) + 1) % REST_STEPS.length];
    setRestOverrides((m) => ({ ...m, [slot.exerciseId]: next }));
  };

  const handleToggle = async (slot: RoutineExercise, setNo: number, w: number, r: number) => {
    const wasDone = isDone(session.logs, slot.exerciseId, setNo);
    await toggleSet(session, slot.exerciseId, setNo, w, r);
    if (!wasDone) startRest(restOf(slot), exerciseLabel(byId.get(slot.exerciseId)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setSheet(true)} className="press text-sm text-muted">
          结束
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">{routine.name}</div>
          <div className="text-[12px] text-muted tabular-nums">{dur(now - session.startedAt)}</div>
        </div>
        <div className="text-sm font-semibold tabular-nums text-accent">
          {done}/{total}
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: pct + "%" }} />
      </div>

      {routine.blocks.map((block, bi) => (
        <div key={bi} className="space-y-2">
          {block.type === "superset" && (
            <div className="px-1 text-[12px] font-medium uppercase tracking-wide text-accent">超级组 · 交替</div>
          )}
          {block.exercises.map((slot, si) => {
            const ghost = ghosts.get(slot.exerciseId);
            const ex = byId.get(slot.exerciseId);
            if (ex?.bodyPart === "cardio") {
              return (
                <CardioCard
                  key={slot.exerciseId + "-" + bi + "-" + si}
                  slot={slot}
                  exercise={ex}
                  log={session.logs.find((l) => l.exerciseId === slot.exerciseId)}
                  kg={latestWeight(metrics ?? [])}
                  onToggle={(minutes) =>
                    void toggleSet(session, slot.exerciseId, 1, 0, 0, minutes * 60)
                  }
                />
              );
            }
            return (
              <ExerciseCard
                key={slot.exerciseId + "-" + bi + "-" + si}
                slot={slot}
                exercise={byId.get(slot.exerciseId)}
                logs={session.logs.filter((l) => l.exerciseId === slot.exerciseId)}
                ghost={ghost ? { weight: ghost.weight, reps: ghost.reps } : undefined}
                restSec={restOf(slot)}
                unit={unit}
                onToggle={(setNo, w, r) => void handleToggle(slot, setNo, w, r)}
                onCycleRest={() => cycleRest(slot)}
                onTutorial={() => setTut(byId.get(slot.exerciseId) ?? null)}
              />
            );
          })}
        </div>
      ))}

      <Sheet open={!!tut} onClose={() => setTut(null)} title={exerciseLabel(tut ?? undefined)}>
        {tut && <TutorialList exercise={tut} />}
      </Sheet>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="结束训练">
        <div className="text-sm text-muted tabular-nums">
          {dur(now - session.startedAt)} · {done} 组 · 容量 {sessionVolume(session.logs)} kg · ≈{" "}
          {estimateKcal(session, [...byId.values()], latestWeight(metrics ?? []))} kcal（有氧）
        </div>
        <p className="mt-1 text-[11px] text-muted">只统计有氧（按时长估算）；力量训练不计入，避免组间休息被误算</p>
        <button
          onClick={() => void finishSession(session).then(() => stopRest())}
          className="press mt-3 w-full rounded-xl bg-accent py-4 font-semibold text-onaccent"
        >
          完成训练
        </button>
        <button
          onClick={() => {
            void discardSession(session).then(() => {
              stopRest();
              setSheet(false);
              toast("已删除本次训练", "撤销", () => void db.sessions.put(session));
            });
          }}
          className="press mt-2 w-full rounded-xl border border-line py-3 text-sm text-muted"
        >
          删除本次
        </button>
      </Sheet>
    </div>
  );
}

function Picker({ onNavigate, onOpenTips }: { onNavigate: (tab: "plans" | "library" | "body" | "me") => void; onOpenTips: () => void }) {
  const programs = useLiveQuery(() => db.programs.toArray(), []);
  const routines = useLiveQuery(() => db.routines.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const last = (sessions ?? []).filter((s) => s.endedAt).sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))[0];
  const [open, setOpen] = useState<string | null>(null);
  const [follow, setFollow] = useState<Routine | null>(null);
  const [followPick, setFollowPick] = useState(false);
  const cycle = settings?.cycle ? cycleInfo(settings.cycle) : null;
  const byId = new Map((routines ?? []).map((r) => [r.id, r]));
  const signal = homeSignal(sessions ?? [], localDate());
  const todayKey = localDate();
  const dowKey = String(((new Date().getDay() + 6) % 7) + 1);
  const rawToday = settings?.schedule?.[todayKey];
  const todayIds = [
    ...(Array.isArray(rawToday) ? rawToday : rawToday ? [rawToday as unknown as string] : []),
    ...(settings?.weeklySchedule?.[dowKey] ? [settings.weeklySchedule[dowKey]] : []),
  ].filter((v, i, a) => !!v && a.indexOf(v) === i);
  const scheduledList = todayIds.map((id) => byId.get(id)).filter(Boolean);
  const ordered = [...(programs ?? [])].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
  const finished = (sessions ?? []).filter((s) => s.endedAt);
  const stale = finished.length >= 3 && (!settings?.lastExportAt || Date.now() - settings.lastExportAt > 14 * 864e5);
  const needBackup = stale && (settings?.backupSnoozeUntil ?? 0) < Date.now();
  const lastRoutine = last ? byId.get(last.routineId) : undefined;

  if (follow) return <FollowAlong routine={follow} onExit={() => setFollow(null)} />;

  return (
    <div className="space-y-3">
      <QuickGrid
        items={[
          { id: "follow", label: "跟练", icon: "play", bg: "#F8E4EA", fg: "#C65C7C", onClick: () => setFollowPick(true) },
          { id: "plans", label: "计划", icon: "calendar", bg: "#F8EDDF", fg: "#B98F5E", onClick: () => onNavigate("plans") },
          { id: "library", label: "动作库", icon: "list", bg: "#F0E8F6", fg: "#A07CB8", onClick: () => onNavigate("library") },
          { id: "calendar", label: "日历", icon: "target", bg: "#E8EFF8", fg: "#7E97C4", onClick: () => onNavigate("plans") },
          { id: "data", label: "数据", icon: "chart", bg: "#E9F2EC", fg: "#6F9A83", onClick: () => onNavigate("body") },
          { id: "tips", label: "女性健康", icon: "heart", bg: "#FBE9DF", fg: "#CD7F63", onClick: onOpenTips },
          { id: "stats", label: "统计", icon: "flame", bg: "#F5EDE0", fg: "#B4895F", onClick: () => onNavigate("body") },
          { id: "me", label: "设置", icon: "settings", bg: "#EFEDEC", fg: "#6B6266", onClick: () => onNavigate("me") },
        ]}
      />

      <Card className="bg-gradient-to-br from-accent/20 to-transparent">
        <div className="text-[12px] text-muted">{localDate()}</div>
        <div className="mt-0.5 text-lg font-semibold">{signal.title}</div>
        <div className="mt-0.5 text-xs text-muted">{signal.detail}</div>
      </Card>

      <div className="flex gap-2">
        <button
          onClick={() => setFollowPick(true)}
          className="press flex-1 rounded-xl border border-line bg-surface py-2.5 text-[12px] font-medium"
        >
          跟练模式 · 语音提示
        </button>
      </div>

      {cycle && (
        <Card className="border-accent/30">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-muted">周期 · {PHASE_LABEL[cycle.phase]} 第 {cycle.day} 天</span>
            <span className="text-[11px] text-muted">预计 {cycle.daysToNext} 天后</span>
          </div>
          <div className="mt-1 text-sm font-semibold">{PHASE_TIP[cycle.phase].title}</div>
          <div className="mt-0.5 text-[12px] text-muted">{PHASE_TIP[cycle.phase].body}</div>
        </Card>
      )}

      {!!scheduledList.length && (
        <Card className="border-accent/30">
          <div className="text-[12px] text-muted">今天安排</div>
          <div className="mt-1 space-y-1.5">
            {scheduledList.map((r) => (
              <button
                key={r!.id}
                onClick={() => {
                  void startSession(undefined, r!.id);
                  void ensureNotifyPermission();
                }}
                className="flex w-full items-center justify-between rounded-xl bg-surface2 px-3 py-2.5 text-left"
              >
                <span className="text-sm">{r!.name}</span>
                <span className="text-[11px] text-muted tabular-nums">{plannedSets(r!)} 组 · 开始</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {needBackup && (
        <Card className="border-accent/40">
          <div className="text-sm font-semibold">该备份了</div>
          <div className="mt-0.5 text-[12px] text-muted">
            已记录 {finished.length} 次训练，建议导出 JSON 存到网盘；清缓存会丢数据。
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() =>
                void exportJSON().then(() => toast("已导出备份文件"))
              }
              className="press flex-1 rounded-xl bg-accent py-2.5 text-xs font-semibold text-onaccent"
            >
              立即导出
            </button>
            <button
              onClick={() =>
                void db.settings.update("app", { backupSnoozeUntil: Date.now() + 7 * 864e5 })
              }
              className="press flex-1 rounded-xl border border-line py-2.5 text-xs text-muted"
            >
              7 天后提醒
            </button>
          </div>
        </Card>
      )}

      {last && (
        <div className="rounded-3xl border border-line bg-surface2 p-3">
          <div className="text-[12px] text-muted">上次训练</div>
          <div className="mt-0.5 text-sm font-medium">
            {lastRoutine?.name ?? "训练"} · {last.logs.length} 组 · {sessionVolume(last.logs)} kg
          </div>
        </div>
      )}

      {ordered.map((p) => {
        const expanded = open === p.id;
        return (
          <div key={p.id} className="overflow-hidden rounded-3xl border border-line bg-surface">
            <button
              onClick={() => setOpen(expanded ? null : p.id)}
              className="press flex w-full items-baseline justify-between p-4 text-left"
            >
              <div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <Icon name="dumbbell" size={16} className="text-accent" />
                  {p.name}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">{p.note}</div>
              </div>
              <div className="shrink-0 text-[12px] text-muted">
                {p.weeks} 周 · {p.routineIds.length} 练
              </div>
            </button>
            {expanded && (
              <div className="space-y-1 px-3 pb-3">
                {p.routineIds.map((rid) => {
                  const r = byId.get(rid);
                  if (!r) return null;
                  return (
                    <button
                      key={rid}
                      onClick={() => {
                        void startSession(p.id, rid);
                        void ensureNotifyPermission();
                      }}
                      className="press flex w-full items-center justify-between rounded-xl bg-surface2 px-3 py-3 text-left"
                    >
                      <span className="text-sm">{r.name}</span>
                      <span className="text-[12px] text-muted tabular-nums">{plannedSets(r)} 组 · 开始</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <Sheet open={followPick} onClose={() => setFollowPick(false)} title="选择跟练例程" size="full">
        <div className="space-y-1">
          {(routines ?? []).map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setFollowPick(false);
                setFollow(r);
              }}
              className="flex w-full items-center justify-between rounded-xl bg-surface2 px-3 py-3 text-left"
            >
              <span className="text-sm">{r.name}</span>
              <span className="text-[11px] text-muted">{plannedSets(r)} 组</span>
            </button>
          ))}
        </div>
      </Sheet>

      <p className="pt-2 text-center text-[11px] tracking-[0.18em] text-muted/70">BY REDONE</p>
    </div>
  );
}

export function TrainScreen({ onNavigate }: { onNavigate: (tab: "plans" | "library" | "body" | "me") => void }) {
  const active = useLiveQuery(activeSession, []);
  const [tips, setTips] = useState(false);
  return (
    <>
      {active ? <Workout session={active} /> : <Picker onNavigate={onNavigate} onOpenTips={() => setTips(true)} />}
      <RestBar />
      {tips && <TipsPage onClose={() => setTips(false)} />}
    </>
  );
}
