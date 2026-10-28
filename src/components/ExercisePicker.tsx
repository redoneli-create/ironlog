import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BODY_PART_ZH, BODY_PARTS, db, equipmentZh, exerciseLabel, type Exercise } from "../lib/db";
import { COMMON_RANK } from "../data/common";
import { MUSCLES, matchesMuscle } from "../data/muscles";
import { Chip, Empty, Sheet, TextInput } from "./ui";

export function ExercisePicker(props: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void }) {
  const [q, setQ] = useState("");
  const [part, setPart] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [commonOnly, setCommonOnly] = useState(false);
  const all = useLiveQuery(() => db.exercises.toArray(), []);

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (all ?? [])
      .filter((e) => !part || e.bodyPart === part)
      .filter((e) => !muscle || matchesMuscle(e, muscle))
      .filter((e) => !commonOnly || COMMON_RANK.has(e.id))
      .filter(
        (e) =>
          !kw ||
          e.name.toLowerCase().includes(kw) ||
          (e.zh ?? "").includes(kw) ||
          e.equipment.toLowerCase().includes(kw) ||
          (e.tags ?? []).some((t) => t.toLowerCase().includes(kw)),
      )
      .sort((a, b) => {
        const ra = COMMON_RANK.get(a.id);
        const rb = COMMON_RANK.get(b.id);
        if (ra !== undefined || rb !== undefined) return (ra ?? 9999) - (rb ?? 9999);
        return (a.zh ?? a.name).localeCompare(b.zh ?? b.name, "zh");
      })
      .slice(0, 80);
  }, [all, q, part, muscle, commonOnly]);

  return (
    <Sheet open={props.open} onClose={props.onClose} title="选择动作" size="full">
      <TextInput value={q} onChange={setQ} placeholder="搜索名称 / 器械" />
      <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
        <Chip active={!part && !muscle} onClick={() => { setPart(null); setMuscle(null); }}>
          全部
        </Chip>
        <Chip active={commonOnly} onClick={() => setCommonOnly(!commonOnly)}>
          常用
        </Chip>
        {BODY_PARTS.map((p) => (
          <Chip key={p} active={part === p} onClick={() => { setPart(part === p ? null : p); setMuscle(null); }}>
            {BODY_PART_ZH[p]}
          </Chip>
        ))}
      </div>

      <div className="no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
        {MUSCLES.filter((m) => !part || m.part === part).map((m) => (
          <Chip key={m.id} active={muscle === m.id} onClick={() => setMuscle(muscle === m.id ? null : m.id)}>
            {m.zh}
          </Chip>
        ))}
      </div>
      <div className="mt-2 space-y-1">
        {list.map((e) => (
          <button
            key={e.id}
            onClick={() => props.onPick(e)}
            className="press flex w-full items-center justify-between rounded-xl bg-surface2 px-3 py-2.5 text-left"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm">{exerciseLabel(e)}</span>
              <span className="block truncate text-[12px] text-muted">{e.name}</span>
            </span>
            <span className="ml-2 shrink-0 text-[12px] text-muted">
              {BODY_PART_ZH[e.bodyPart] ?? e.bodyPart} · {equipmentZh(e.equipment)}
            </span>
          </button>
        ))}
        {!list.length && <Empty text="没有匹配的动作" />}
      </div>
    </Sheet>
  );
}
