import type { BodyMetric, Exercise, Session } from "./db";

const MET: Record<string, number> = {
  barbell: 6,
  "olympic barbell": 6,
  "ez barbell": 5,
  "trap bar": 6,
  dumbbell: 5,
  kettlebell: 6,
  cable: 4.5,
  "leverage machine": 4,
  "smith machine": 5,
  "body weight": 5,
  band: 4,
  "resistance band": 4,
  assisted: 4,
  weighted: 6,
  rope: 6,
  "medicine ball": 5.5,
  "stability ball": 4,
  "bosu ball": 4,
  roller: 3.5,
  "wheel roller": 4.5,
  "stationary bike": 7,
  "elliptical machine": 6.5,
  "skierg machine": 7.5,
  "stepmill machine": 8,
  "upper body ergometer": 5.5,
  "sled machine": 7,
  tire: 6.5,
  hammer: 5,
  machine: 4,
  custom: 4.5,
};

/** 按动作器械估 MET，再用会话时长折算千卡（MET × 3.5 × kg ÷ 200 × 分钟） */
export function estimateKcal(session: Session, exercises: Exercise[], bodyWeight = 70): number {
  if (!session.logs.length) return 0;
  const end = session.endedAt ?? Date.now();
  const minutes = Math.max(1, (end - session.startedAt) / 60000);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  let sum = 0;
  for (const log of session.logs) {
    const ex = byId.get(log.exerciseId);
    const met = ex?.bodyPart === "cardio" ? 8 : MET[ex?.equipment ?? ""] ?? 4.5;
    sum += met;
  }
  const met = sum / session.logs.length;
  return Math.round(((met * 3.5 * bodyWeight) / 200) * minutes);
}

export function latestWeight(metrics: BodyMetric[]): number {
  const withWeight = [...metrics].filter((m) => typeof m.weight === "number").sort((a, b) => (a.date < b.date ? 1 : -1));
  return withWeight[0]?.weight ?? 70;
}
