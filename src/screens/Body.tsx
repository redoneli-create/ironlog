import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, localDate, type BodyMetric } from "../lib/db";
import { Btn, Card, Chip, Empty, Field, TextInput } from "../components/ui";
import { toast } from "../lib/toast";

type Point = { date: string; v: number };

function Trend({ points, unit }: { points: Point[]; unit: string }) {
  if (points.length < 2) return <Empty text="至少 2 条记录生成趋势" />;
  const W = 320;
  const H = 132;
  const P = 12;
  const vs = points.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const span = max - min || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P);
  const line = points.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.v).toFixed(1)).join(" ");
  const area = line + " L " + x(points.length - 1) + " " + (H - P) + " L " + x(0) + " " + (H - P) + " Z";
  const last = points[points.length - 1];
  const delta = Math.round((last.v - points[0].v) * 10) / 10;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-semibold tabular-nums">
          {last.v}
          <span className="ml-1 text-xs text-muted">{unit}</span>
        </div>
        <div className={"text-[12px] tabular-nums " + (delta > 0 ? "text-accent" : "text-muted")}>
          {(delta > 0 ? "+" : "") + delta} {unit}
        </div>
      </div>
      <svg viewBox={"0 0 " + W + " " + H} className="mt-1 w-full">
        <path d={area} fill="var(--accent)" opacity="0.12" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.v)} r={points.length > 40 ? 0 : 2} fill="var(--accent)" />
        ))}
      </svg>
      <div className="flex justify-between text-[12px] text-muted">
        <span>{points[0].date.slice(5)}</span>
        <span>{last.date.slice(5)}</span>
      </div>
    </div>
  );
}

export function BodyScreen() {
  const metrics = useLiveQuery(() => db.metrics.orderBy("date").toArray(), []);
  const [date, setDate] = useState(localDate());
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [metric, setMetric] = useState<"weight" | "bodyFat">("weight");

  const save = async () => {
    const w = Number(weight);
    const f = Number(fat);
    if (!w && !f) return;
    const prev = await db.metrics.get(date);
    const row: BodyMetric = {
      date,
      weight: w ? w : prev?.weight,
      bodyFat: f ? f : prev?.bodyFat,
    };
    await db.metrics.put(row);
    setWeight("");
    setFat("");
  };

  const list = metrics ?? [];
  const points: Point[] = list
    .filter((m) => (metric === "weight" ? !!m.weight : !!m.bodyFat))
    .map((m) => ({ date: m.date, v: (metric === "weight" ? m.weight : m.bodyFat) as number }))
    .slice(-90);

  const unit = metric === "weight" ? "kg" : "%";

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">记录</h3>
          <div className="flex gap-1.5">
            <Chip active={metric === "weight"} onClick={() => setMetric("weight")}>
              体重
            </Chip>
            <Chip active={metric === "bodyFat"} onClick={() => setMetric("bodyFat")}>
              体脂
            </Chip>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Field label="日期">
            <TextInput value={date} onChange={setDate} type="date" />
          </Field>
          <Field label="体重 kg / 体脂 %">
            <div className="flex gap-2">
              <TextInput value={weight} onChange={setWeight} inputMode="decimal" placeholder="体重" />
              <TextInput value={fat} onChange={setFat} inputMode="decimal" placeholder="体脂" />
            </div>
          </Field>
        </div>
        <Btn className="mt-3 py-3" onClick={() => void save()}>
          保存
        </Btn>
      </Card>

      <Card>
        <Trend points={points} unit={unit} />
      </Card>

      <Card>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">历史</h3>
          <span className="text-[12px] text-muted">{list.length} 条</span>
        </div>
        <div className="mt-2 space-y-1">
          {[...list].reverse().slice(0, 12).map((m) => (
            <div key={m.date} className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2">
              <span className="text-xs text-muted tabular-nums">{m.date}</span>
              <span className="text-xs tabular-nums">
                {m.weight ? m.weight + " kg" : "—"}
                <span className="text-muted"> · </span>
                {m.bodyFat ? m.bodyFat + "%" : "—"}
              </span>
              <button
                onClick={() => {
                  const removed = m;
                  void db.metrics.delete(removed.date).then(() =>
                    toast("已删除记录", "撤销", () => void db.metrics.put(removed)),
                  );
                }}
                className="pl-3 text-xs text-muted"
                aria-label="删除"
              >
                ✕
              </button>
            </div>
          ))}
          {!list.length && <Empty text="还没有身体数据" />}
        </div>
      </Card>
    </div>
  );
}
