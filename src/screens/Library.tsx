import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BODY_PART_ZH, BODY_PARTS, db, equipmentZh, exerciseLabel, muscleZh, uid, type Exercise } from "../lib/db";
import { COMMON_RANK } from "../data/common";
import { epley, prByExercise } from "../lib/metrics";
import { toast } from "../lib/toast";
import { Btn, Chip, Empty, Field, Sheet, TextInput } from "../components/ui";
import { TutorialList } from "../components/Tutorials";
import { BodyMap } from "../components/BodyMap";

function ExerciseHistory({ exerciseId }: { exerciseId: string }) {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const pr = prByExercise(sessions ?? []);
  const rows = (sessions ?? [])
    .filter((s) => s.logs.some((l) => l.exerciseId === exerciseId))
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
    .slice(0, 5);
  if (!rows.length) return <p className="text-[12px] text-muted">还没有训练记录</p>;
  return (
    <div className="space-y-1.5">
      {rows.map((s) => {
        const logs = s.logs.filter((l) => l.exerciseId === exerciseId);
        const best = logs.reduce((a, b) => (epley(b.weight, b.reps) > epley(a.weight, a.reps) ? b : a));
        const isPr = epley(best.weight, best.reps) >= (pr.get(exerciseId) ?? 0) - 0.05;
        return (
          <div key={s.id} className="flex items-baseline justify-between text-[12px]">
            <span className="text-muted tabular-nums">{s.date}</span>
            <span className="tabular-nums">
              {logs.length} 组 · 最佳 {best.weight}×{best.reps}
              {isPr && <span className="text-accent"> · 纪录</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const ex = useLiveQuery(() => db.exercises.get(id), [id]);
  if (!ex) return null;
  return (
    <Sheet open onClose={onClose} title={exerciseLabel(ex)}>
      <div className="space-y-1 text-sm">
        <div className="text-muted">{ex.name}</div>
        <div className="text-xs text-muted">
          {BODY_PART_ZH[ex.bodyPart] ?? ex.bodyPart} · {equipmentZh(ex.equipment)} · 目标 {muscleZh(ex.target) || "—"}
        </div>
        {!!ex.secondary?.length && (
          <div className="text-xs text-muted">协同：{ex.secondary.map((m) => muscleZh(m)).join(" / ")}</div>
        )}
        {!!ex.tags?.length && (
          <div className="flex flex-wrap gap-1 pt-1">
            {ex.tags.map((t) => (
              <span key={t} className="rounded bg-surface2 px-1.5 py-0.5 text-[11px] text-muted">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="text-[12px] text-muted">历史与纪录</div>
        <div className="mt-1.5">
          <ExerciseHistory exerciseId={ex.id} />
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <TutorialList exercise={ex} editable />
      </div>

      {ex.isCustom && (
        <Btn
          kind="ghost"
          className="mt-4"
          onClick={() => {
            const removed = ex;
            void db.exercises.delete(removed.id).then(() => {
              onClose();
              toast("已删除自定义动作", "撤销", () => void db.exercises.put(removed));
            });
          }}
        >
          删除自定义动作
        </Btn>
      )}
    </Sheet>
  );
}

function Create({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [zh, setZh] = useState("");
  const [part, setPart] = useState<string>("chest");
  const [equipment, setEquipment] = useState("dumbbell");
  const [target, setTarget] = useState("");

  const save = async () => {
    if (!name.trim()) return;
    await db.exercises.put({
      id: "c-" + uid(),
      name: name.trim(),
      zh: zh.trim() || undefined,
      bodyPart: part,
      equipment: equipment.trim() || "dumbbell",
      target: target.trim(),
      secondary: [],
      isCustom: true,
    });
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="自定义动作">
      <div className="space-y-2">
        <Field label="名称（英文，便于排序/导出）">
          <TextInput value={name} onChange={setName} placeholder="e.g. cable y-raise" />
        </Field>
        <Field label="中文名（可选）">
          <TextInput value={zh} onChange={setZh} placeholder="例如 绳索 Y 字举" />
        </Field>
        <Field label="部位">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto py-1">
            {BODY_PARTS.map((p) => (
              <Chip key={p} active={part === p} onClick={() => setPart(p)}>
                {BODY_PART_ZH[p]}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="器械">
            <TextInput value={equipment} onChange={setEquipment} />
          </Field>
          <Field label="目标肌群">
            <TextInput value={target} onChange={setTarget} placeholder="可选" />
          </Field>
        </div>
      </div>
      <Btn className="mt-4" onClick={() => void save()} disabled={!name.trim()}>
        保存动作
      </Btn>
    </Sheet>
  );
}

function Row({ e, onClick }: { e: Exercise; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between border-b border-line px-3 py-2.5 text-left last:border-0"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 truncate text-sm">
          <span className="truncate">{exerciseLabel(e)}</span>
          {COMMON_RANK.has(e.id) && (
            <span className="shrink-0 rounded bg-accent/15 px-1 py-0.5 text-[10px] text-accent">常用</span>
          )}
        </span>
        <span className="block truncate text-[12px] text-muted">
          {e.zh ? e.name : [e.equipment, e.target].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="ml-2 shrink-0 text-[12px] text-muted">{BODY_PART_ZH[e.bodyPart] ?? e.bodyPart}</span>
    </button>
  );
}

function Group(props: { title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button onClick={props.onToggle} className="flex w-full items-center justify-between px-3 py-3 text-left">
        <span className="text-sm font-medium">{props.title}</span>
        <span className="text-[12px] text-muted">
          {props.count} 个 · {props.open ? "收起" : "展开"}
        </span>
      </button>
      {props.open && <div>{props.children}</div>}
    </div>
  );
}

export function LibraryScreen() {
  const [q, setQ] = useState("");
  const [part, setPart] = useState<string | null>(null);
  const [customOnly, setCustomOnly] = useState(false);
  const [commonOnly, setCommonOnly] = useState(false);
  const [limit, setLimit] = useState(60);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "map">("list");
  const [openMine, setOpenMine] = useState(true);
  const [openOfficial, setOpenOfficial] = useState(true);
  const all = useLiveQuery(() => db.exercises.toArray(), []);

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (all ?? [])
      .filter((e) => !part || e.bodyPart === part)
      .filter((e) => !customOnly || e.isCustom)
      .filter((e) => !commonOnly || COMMON_RANK.has(e.id))
      .filter(
        (e) =>
          !kw ||
          e.name.toLowerCase().includes(kw) ||
          (e.zh ?? "").includes(kw) ||
          e.equipment.toLowerCase().includes(kw) ||
          e.target.toLowerCase().includes(kw) ||
          (e.tags ?? []).some((t) => t.toLowerCase().includes(kw)),
      )
      .sort((a, b) => {
        const ra = COMMON_RANK.get(a.id);
        const rb = COMMON_RANK.get(b.id);
        if (ra !== undefined || rb !== undefined) return (ra ?? 9999) - (rb ?? 9999);
        if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
        return (a.zh ?? a.name).localeCompare(b.zh ?? b.name, "zh");
      });
  }, [all, q, part, customOnly, commonOnly]);

  const mine = list.filter((e) => e.isCustom);
  const official = list.filter((e) => !e.isCustom);
  const filtered = !!(q.trim() || part || commonOnly || customOnly);

  const renderRows = (rows: Exercise[], emptyText?: string) => (
    <>
      {rows.slice(0, limit).map((e) => (
        <Row key={e.id} e={e} onClick={() => setDetail(e.id)} />
      ))}
      {!rows.length && emptyText ? <Empty text={emptyText} /> : null}
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <Chip active={mode === "list"} onClick={() => setMode("list")}>
          动作库
        </Chip>
        <Chip active={mode === "map"} onClick={() => setMode("map")}>
          肌肉图
        </Chip>
      </div>

      {mode === "map" ? (
        <BodyMap
          onPick={(p) => {
            setPart(p);
            setMode("list");
            setOpenOfficial(true);
          }}
        />
      ) : (
        <>
          <div className="flex gap-2">
            <TextInput value={q} onChange={setQ} placeholder={"搜索动作（共 " + (all?.length ?? 0) + " 个）"} />
            <button
              onClick={() => setCreating(true)}
              className="press shrink-0 rounded-xl bg-accent px-3 text-sm font-semibold text-onaccent"
            >
              +
            </button>
          </div>

          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            <Chip active={!part && !customOnly && !commonOnly} onClick={() => { setPart(null); setCustomOnly(false); setCommonOnly(false); }}>
              全部
            </Chip>
            <Chip active={commonOnly} onClick={() => setCommonOnly(!commonOnly)}>
              常用
            </Chip>
            <Chip active={customOnly} onClick={() => setCustomOnly(!customOnly)}>
              我的动作
            </Chip>
            {BODY_PARTS.map((p) => (
              <Chip key={p} active={part === p} onClick={() => setPart(part === p ? null : p)}>
                {BODY_PART_ZH[p]}
              </Chip>
            ))}
          </div>

          {filtered ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">{renderRows(list)}</div>
          ) : (
            <>
              <Group
                title="我的动作"
                count={mine.length}
                open={openMine}
                onToggle={() => setOpenMine(!openMine)}
              >
                {renderRows(mine, "还没有自建动作，点右上角 + 添加")}
              </Group>
              <Group
                title="官方动作库"
                count={official.length}
                open={openOfficial}
                onToggle={() => setOpenOfficial(!openOfficial)}
              >
                {renderRows(official, "没有匹配动作")}
              </Group>
            </>
          )}

          {list.length > limit && (
            <Btn kind="ghost" onClick={() => setLimit(limit + 80)}>
              显示更多（{list.length - limit}）
            </Btn>
          )}
        </>
      )}

      {creating && <Create onClose={() => setCreating(false)} />}
      {detail && <Detail id={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
