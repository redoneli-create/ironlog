import { localDate } from "./db";

export type Phase = "period" | "follicular" | "ovulation" | "luteal";

export interface CycleSettings {
  lastStart: string;
  length: number;
  periodLength?: number;
}

export interface CycleInfo {
  phase: Phase;
  day: number;
  nextStart: string;
  daysToNext: number;
}

export const PHASE_LABEL: Record<Phase, string> = {
  period: "经期",
  follicular: "卵泡期",
  ovulation: "排卵期",
  luteal: "黄体期",
};

/** 每个阶段的训练建议（通用建议，非医疗意见） */
export const PHASE_TIP: Record<Phase, { title: string; body: string }> = {
  period: {
    title: "今天适合：舒缓拉伸",
    body: "不用硬练。散步、髋部拉伸、轻重量下肢都行；痛经明显就休息。",
  },
  follicular: {
    title: "今天适合：加重量",
    body: "雌激素回升，力量表现通常最好，适合冲重量或新动作。",
  },
  ovulation: {
    title: "今天适合：高强度",
    body: "状态高峰，适合做大重量或 HIIT；注意热身和关节稳定。",
  },
  luteal: {
    title: "今天适合：稳定输出",
    body: "黄体期容易水肿、疲劳，维持重量、减少力竭组，睡够更重要。",
  },
};

const DAY = 86400000;

export function cycleInfo(c: CycleSettings, today = localDate()): CycleInfo | null {
  if (!c.lastStart || !c.length) return null;
  const start = new Date(c.lastStart + "T00:00:00").getTime();
  const now = new Date(today + "T00:00:00").getTime();
  if (!Number.isFinite(start) || !Number.isFinite(now)) return null;
  const length = Math.min(60, Math.max(18, c.length));
  const periodLength = Math.min(10, Math.max(2, c.periodLength ?? 5));
  const diff = Math.floor((now - start) / DAY);
  const dayInCycle = ((diff % length) + length) % length;
  const day = dayInCycle + 1;

  const ovulationDay = Math.max(periodLength + 3, length - 14);
  const phase: Phase =
    day <= periodLength
      ? "period"
      : day < ovulationDay - 1
        ? "follicular"
        : day <= ovulationDay + 1
          ? "ovulation"
          : "luteal";

  const cyclesPassed = Math.ceil(Math.max(0, diff) / length);
  const nextStartMs = start + Math.max(1, cyclesPassed) * length * DAY;
  const nextStart = localDate(new Date(nextStartMs));
  const daysToNext = Math.max(0, Math.round((nextStartMs - now) / DAY));

  return { phase, day, nextStart, daysToNext };
}
