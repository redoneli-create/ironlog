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

/** 有效训练时长：按每组完成时间累加，间隔超过 5 分钟按 5 分钟算（避免忘记关掉导致数字巨大） */
export function activeMinutes(session: Session): number {
  const times = session.logs.map((l) => l.doneAt).sort((a, b) => a - b);
  if (!times.length) return 0;
  let ms = 60_000; // 第一组按 1 分钟
  for (let i = 1; i < times.length; i++) {
    ms += Math.min(times[i] - times[i - 1], 300_000);
  }
  return ms / 60000;
}

/** 有氧按实际记录时长计；力量按有效时长 × 平均 MET 计。MET × 3.5 × kg ÷ 200 × 分钟 */
export function estimateKcal(session: Session, exercises: Exercise[], bodyWeight = 70): number {
  if (!session.logs.length) return 0;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  let cardioMin = 0;
  let metSum = 0;
  let metCount = 0;

  for (const log of session.logs) {
    const ex = byId.get(log.exerciseId);
    if (ex?.bodyPart === "cardio") {
      cardioMin += (log.seconds ?? 0) / 60;
      continue;
    }
    metSum += MET[ex?.equipment ?? ""] ?? 4.5;
    metCount += 1;
  }

  const strengthMin = Math.max(0, activeMinutes(session) - cardioMin);
  const met = metCount ? metSum / metCount : 4.5;
  const strengthKcal = (met * 3.5 * bodyWeight) / 200 * strengthMin;
  const cardioKcal = (8 * 3.5 * bodyWeight) / 200 * cardioMin;
  return Math.round(strengthKcal + cardioKcal);
}

export function latestWeight(metrics: BodyMetric[]): number {
  const withWeight = [...metrics].filter((m) => typeof m.weight === "number").sort((a, b) => (a.date < b.date ? 1 : -1));
  return withWeight[0]?.weight ?? 70;
}
