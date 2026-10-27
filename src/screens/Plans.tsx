import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  exerciseLabel,
  uid,
  type Block,
  type Exercise,
  type Program,
  type Routine,
  type RoutineExercise,
} from "../lib/db";
import { plannedSets, startSession } from "../lib/session";
import { toast } from "../lib/toast";
import { Btn, Card, Chip, Empty, Field, Sheet, TextInput } from "../components/ui";
import { ExercisePicker } from "../components/ExercisePicker";
import { CalendarScreen } from "./Calendar";

type Slot = RoutineExercise & { merge?: boolean };

const flatten = (r: Routine): Slot[] =>
  r.blocks.flatMap((b) => b.exercises.map((e, i) => ({ ...e, merge: b.type === "superset" && i > 0 })));

const toBlocks = (slots: Slot[]): Block[] => {
  const blocks: Block[] = [];
  for (const s of slots) {
    const { merge, ...slot } = s;
    const last = blocks[blocks.length - 1];
    if (merge && last) {
      last.exercises.push(slot);
      last.type = "superset";
    } else {
      blocks.push({ type: "single", exercises: [slot] });
    }
  }
  return blocks;
};

const Mini = (props: { label: string; value: string; onChange: (v: string) => void; mode?: "numeric" | "text" }) => (
  <label className="block">
    <div className="mb-0.5 text-[12px] text-muted">{props.label}</div>
    <input
      inputMode={props.mode === "text" ? "text" : "numeric"}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      className="h-9 w-full rounded-lg bg-surface px-2 text-xs tabular-nums outline-none focus:ring-2 focus:ring-accent/50"
    />
  </label>
);

function RoutineEditor(props: { routine: Routine | null; onClose: () => void }) {
  const [name, setName] = useState(props.routine?.name ?? "");
  const [slots, setSlots] = useState<Slot[]>(props.routine ? flatten(props.routine) : []);
  const [picking, setPicking] = useState(false);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const byId = new Map((exercises ?? []).map((e) => [e.id, e]));

  const patch = (i: number, p: Partial<Slot>) => setSlots((list) => list.map((s, j) => (j === i ? { ...s, ...p } : s)));

  const add = (e: Exercise) => {
    setSlots((list) => [...list, { exerciseId: e.id, sets: 3, reps: "8-12", restSec: 90 }]);
    setPicking(false);
  };

  const save = async () => {
    const id = props.routine?.id ?? uid();
    await db.routines.put({ id, name: name.trim() || "未命名例程", blocks: toBlocks(slots) });
    props.onClose();
  };

  const remove = async () => {
    const removed = props.routine;
    if (removed) {
      await db.routines.delete(removed.id);
      toast("已删除例程「" + removed.name + "」", "撤销", () => void db.routines.put(removed));
    }
    props.onClose();
  };

  return (
    <Sheet
      open
      onClose={props.onClose}
      title={props.routine ? "编辑例程" : "新建例程"}
      footer={
        <div className="space-y-2">
          <Btn onClick={() => void save()} disabled={!slots.length}>
            {props.routine ? "保存修改" : "创建例程"}
          </Btn>
          {props.routine && (
            <button onClick={() => void remove()} className="w-full py-1.5 text-[12px] text-muted">
              删除该例程
            </button>
          )}
        </div>
      }
    >
      <Field label="例程名">
        <TextInput value={name} onChange={setName} placeholder="例如 上肢 A" />
      </Field>

      <div className="mt-3 space-y-2">
        {slots.map((s, i) => (
          <div key={i} className="rounded-xl bg-surface2 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm">{exerciseLabel(byId.get(s.exerciseId))}</span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => patch(i, { merge: !s.merge })}
                  className={
                    "rounded-md px-1.5 py-1 text-[12px] " + (s.merge ? "bg-accent/15 text-accent" : "text-muted")
                  }
                  title="并入上一动作为超级组"
                >
                  S{s.merge ? "✓" : ""}
                </button>
                <button
                  onClick={() => setSlots((list) => list.filter((_, j) => j !== i))}
                  className="px-1 text-xs text-muted"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Mini label="组" value={String(s.sets)} onChange={(v) => patch(i, { sets: Number(v) || 1 })} />
              <Mini label="次" mode="text" value={s.reps} onChange={(v) => patch(i, { reps: v })} />
              <Mini
                label="重量 kg"
                value={s.weight ? String(s.weight) : ""}
                onChange={(v) => patch(i, { weight: v ? Number(v) : undefined })}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Mini label="休(s)" value={String(s.restSec)} onChange={(v) => patch(i, { restSec: Number(v) || 0 })} />
              <Mini label="Tempo" mode="text" value={s.tempo ?? ""} onChange={(v) => patch(i, { tempo: v || undefined })} />
            </div>
          </div>
        ))}
        {!slots.length && <Empty text="还没有动作" />}
      </div>

      <Btn kind="ghost" className="mt-3" onClick={() => setPicking(true)}>
        + 添加动作
      </Btn>

      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={add} />
    </Sheet>
  );
}

function ProgramEditor(props: { program: Program | null; routines: Routine[]; onClose: () => void }) {
  const [name, setName] = useState(props.program?.name ?? "");
  const [weeks, setWeeks] = useState(String(props.program?.weeks ?? 8));
  const [note, setNote] = useState(props.program?.note ?? "");
  const [ids, setIds] = useState<string[]>(props.program?.routineIds ?? []);
  const [q, setQ] = useState("");

  const toggle = (id: string) =>
    setIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const save = async () => {
    const id = props.program?.id ?? uid();
    await db.programs.put({
      id,
      name: name.trim() || "未命名计划",
      weeks: Number(weeks) || 8,
      note: note.trim() || undefined,
      routineIds: ids,
    });
    props.onClose();
  };

  return (
    <Sheet
      open
      onClose={props.onClose}
      title={props.program ? "编辑计划" : "新建计划"}
      footer={
        <div className="space-y-2">
          <Btn onClick={() => void save()}>保存计划</Btn>
          {props.program && (
            <button
              onClick={() => {
                const removed = props.program!;
                void db.programs.delete(removed.id).then(() => {
                  props.onClose();
                  toast("已删除计划「" + removed.name + "」", "撤销", () => void db.programs.put(removed));
                });
              }}
              className="w-full py-1.5 text-[12px] text-muted"
            >
              删除该计划
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-2">
        <Field label="计划名">
          <TextInput value={name} onChange={setName} placeholder="例如 我的推拉腿" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="周期(周)">
            <TextInput value={weeks} onChange={setWeeks} inputMode="numeric" />
          </Field>
          <Field label="备注">
            <TextInput value={note} onChange={setNote} placeholder="可选" />
          </Field>
        </div>
      </div>

      <div className="mt-3 text-[12px] text-muted">选择例程</div>
      <div className="mt-1">
        <TextInput value={q} onChange={setQ} placeholder="搜索例程，或按分类找" />
      </div>
      <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
        {[
          { key: "female", title: "女生专区" },
          { key: "mine", title: "我的例程" },
          { key: "official", title: "官方例程" },
        ].map((g) => {
          const list = props.routines
            .filter((r) =>
              g.key === "female" ? r.female : g.key === "official" ? r.official && !r.female : !r.official && !r.female,
            )
            .filter((r) => !q.trim() || r.name.includes(q.trim()));
          if (!list.length) return null;
          return (
            <div key={g.key}>
              <div className="px-1 pb-1 text-[11px] text-muted">
                {g.title} · {list.length}
              </div>
              <div className="space-y-1">
                {list.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    className={
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm " +
                      (ids.includes(r.id) ? "bg-accent/10 text-accent" : "bg-surface2 text-ink")
                    }
                  >
                    <span>{r.name}</span>
                    <span className="text-[11px] text-muted tabular-nums">{plannedSets(r)} 组</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {!props.routines.length && <Empty text="先创建一个例程" />}
      </div>


    </Sheet>
  );
}

export function PlansScreen({ onStart }: { onStart: () => void }) {
  const programs = useLiveQuery(() => db.programs.toArray(), []);
  const routines = useLiveQuery(() => db.routines.toArray(), []);
  const [open, setOpen] = useState<string | null>(null);
  const [progEdit, setProgEdit] = useState<Program | null | "new">(null);
  const [routineEdit, setRoutineEdit] = useState<Routine | null | "new">(null);
  const [groups, setGroups] = useState<Record<string, boolean>>({ female: true, mine: true, official: true });
  const [view, setView] = useState<"plans" | "calendar">("plans");
  const byId = new Map((routines ?? []).map((r) => [r.id, r]));

  const start = (programId: string | undefined, routineId: string) => {
    void startSession(programId, routineId).then(onStart);
  };

  const sorted = [...(programs ?? [])].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
  const female = sorted.filter((p) => p.female);
  const mine = sorted.filter((p) => !p.official && !p.female);
  const official = sorted.filter((p) => p.official && !p.female);

  const programCard = (p: Program) => {
    const expanded = open === p.id;
    return (
      <div key={p.id} className="overflow-hidden rounded-3xl border border-line bg-surface">
        <button
          onClick={() => setOpen(expanded ? null : p.id)}
          className="press flex w-full items-baseline justify-between p-4 text-left"
        >
          <div className="min-w-0">
            <div className="font-semibold">{p.name}</div>
            <div className="mt-0.5 truncate text-[12px] text-muted">{p.note ?? "自定义计划"}</div>
          </div>
          <div className="shrink-0 pl-2 text-[12px] text-muted">
            {p.weeks} 周 · {p.routineIds.length} 练
          </div>
        </button>
        {expanded && (
          <div className="space-y-1 px-3 pb-3">
            {p.routineIds.map((rid) => {
              const r = byId.get(rid);
              if (!r) return null;
              return (
                <div key={rid} className="flex gap-1">
                  <button
                    onClick={() => start(p.id, rid)}
                    className="press flex flex-1 items-center justify-between rounded-xl bg-surface2 px-3 py-3 text-left"
                  >
                    <span className="text-sm">{r.name}</span>
                    <span className="text-[12px] text-muted tabular-nums">{plannedSets(r)} 组</span>
                  </button>
                  <button
                    onClick={() => setRoutineEdit(r)}
                    className="press rounded-xl border border-line px-3 text-[12px] text-muted"
                  >
                    编辑
                  </button>
                </div>
              );
            })}
            <button onClick={() => setProgEdit(p)} className="w-full py-2 text-[12px] text-muted">
              管理计划
            </button>
          </div>
        )}
      </div>
    );
  };

  const section = (key: string, title: string, list: Program[]) =>
    list.length ? (
      <div key={key} className="space-y-2">
        <button
          onClick={() => setGroups((g) => ({ ...g, [key]: !g[key] }))}
          className="flex w-full items-center justify-between px-1 py-1"
        >
          <span className="text-[12px] font-medium text-muted">
            {title} · {list.length}
          </span>
          <span className="text-[12px] text-muted">{groups[key] ? "收起" : "展开"}</span>
        </button>
        {groups[key] && list.map(programCard)}
      </div>
    ) : null;

  if (view === "calendar") {
    return (
      <div className="space-y-3">
        <div className="flex gap-1.5">
          <Chip active={false} onClick={() => setView("plans")}>训练计划</Chip>
          <Chip active onClick={() => setView("calendar")}>日历</Chip>
        </div>
        <CalendarScreen />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <Chip active onClick={() => setView("plans")}>训练计划</Chip>
        <Chip active={false} onClick={() => setView("calendar")}>日历</Chip>
      </div>

      <div className="flex gap-2">
        <Btn kind="ghost" className="py-2.5" onClick={() => setProgEdit("new")}>
          + 计划
        </Btn>
        <Btn kind="ghost" className="py-2.5" onClick={() => setRoutineEdit("new")}>
          + 例程
        </Btn>
      </div>

      {section("female", "女性专区", female)}
      {section("mine", "我的计划", mine)}
      {section("official", "官方计划", official)}

      <Card>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">全部例程</h3>
          <span className="text-[12px] text-muted">{(routines ?? []).length} 个</span>
        </div>
        <div className="mt-2 space-y-1">
          {(routines ?? []).map((r) => (
            <div key={r.id} className="flex gap-1">
              <button
                onClick={() => start(undefined, r.id)}
                className="press flex flex-1 items-center justify-between rounded-xl bg-surface2 px-3 py-2.5 text-left"
              >
                <span className="truncate text-sm">{r.name}</span>
                <span className="shrink-0 pl-2 text-[12px] text-muted tabular-nums">{plannedSets(r)} 组</span>
              </button>
              <button
                onClick={() => setRoutineEdit(r)}
                className="press rounded-xl border border-line px-3 text-[12px] text-muted"
              >
                编辑
              </button>
            </div>
          ))}
        </div>
      </Card>

      {progEdit !== null && (
        <ProgramEditor
          program={progEdit === "new" ? null : progEdit}
          routines={routines ?? []}
          onClose={() => setProgEdit(null)}
        />
      )}
      {routineEdit !== null && (
        <RoutineEditor
          routine={routineEdit === "new" ? null : routineEdit}
          onClose={() => setRoutineEdit(null)}
        />
      )}
    </div>
  );
}
