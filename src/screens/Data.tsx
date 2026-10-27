import { useState } from "react";
import { BodyScreen } from "./Body";
import { HistoryScreen } from "./History";
import { StatsScreen } from "./Stats";
import { Chip } from "../components/ui";

type Seg = "body" | "history" | "stats";

const SEGS: { id: Seg; label: string }[] = [
  { id: "history", label: "训练" },
  { id: "body", label: "身体" },
  { id: "stats", label: "统计" },
];

export function DataScreen() {
  const [seg, setSeg] = useState<Seg>("history");
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {SEGS.map((s) => (
          <Chip key={s.id} active={seg === s.id} onClick={() => setSeg(s.id)}>
            {s.label}
          </Chip>
        ))}
      </div>
      {seg === "history" && <HistoryScreen />}
      {seg === "body" && <BodyScreen />}
      {seg === "stats" && <StatsScreen />}
    </div>
  );
}
