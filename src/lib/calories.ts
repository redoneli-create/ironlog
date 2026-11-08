import type { BodyMetric, Exercise, Session } from "./db";


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

/**
 * 只统计有氧消耗：时长由用户记录，MET 取 8（中等强度有氧）。
 * 力量训练不估算卡路里（组内净做功时间无法准确得知，硬算会明显偏大）。
 */
export function estimateKcal(session: Session, exercises: Exercise[], bodyWeight = 70): number {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  let cardioMin = 0;
  for (const log of session.logs) {
    const ex = byId.get(log.exerciseId);
    if (ex?.bodyPart === "cardio" && log.seconds) cardioMin += log.seconds / 60;
  }
  if (!cardioMin) return 0;
  return Math.round(((8 * 3.5 * bodyWeight) / 200) * cardioMin);
}

export function latestWeight(metrics: BodyMetric[]): number {
  const withWeight = [...metrics].filter((m) => typeof m.weight === "number").sort((a, b) => (a.date < b.date ? 1 : -1));
  return withWeight[0]?.weight ?? 70;
}
