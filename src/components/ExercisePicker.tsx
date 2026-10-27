import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BODY_PART_ZH, BODY_PARTS, db, equipmentZh, exerciseLabel, type Exercise } from "../lib/db";
import { Chip, Empty, Sheet, TextInput } from "./ui";

export function ExercisePicker(props: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void }) {
  const [q, setQ] = useState("");
  const [part, setPart] = useState<string | null>(null);
  const all = useLiveQuery(() => db.exercises.toArray(), []);

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (all ?? [])
      .filter((e) => !part || e.bodyPart === part)
      .filter(
        (e) =>
          !kw ||
          e.name.toLowerCase().includes(kw) ||
          (e.zh ?? "").includes(kw) ||
          e.equipment.toLowerCase().includes(kw) ||
          (e.tags ?? []).some((t) => t.toLowerCase().includes(kw)),
      )
      .slice(0, 60);
  }, [all, q, part]);

  return (
    <Sheet open={props.open} onClose={props.onClose} title="选择动作">
      <TextInput value={q} onChange={setQ} placeholder="搜索名称 / 器械" />
      <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
        <Chip active={!part} onClick={() => setPart(null)}>
          全部
        </Chip>
        {BODY_PARTS.map((p) => (
          <Chip key={p} active={part === p} onClick={() => setPart(p)}>
            {BODY_PART_ZH[p]}
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
              <span className="block truncate text-[11px] text-muted">{e.name}</span>
            </span>
            <span className="ml-2 shrink-0 text-[11px] text-muted">
              {BODY_PART_ZH[e.bodyPart] ?? e.bodyPart} · {equipmentZh(e.equipment)}
            </span>
          </button>
        ))}
        {!list.length && <Empty text="没有匹配的动作" />}
      </div>
    </Sheet>
  );
}
