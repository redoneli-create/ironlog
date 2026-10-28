import type { BodyPart, Exercise } from "../lib/db";

export interface Muscle {
  id: string;
  zh: string;
  en: string;
  part: BodyPart;
  /** 动作自身的 target / secondary 命中词 */
  keys?: string[];
  /** 人工指定的动作 id（数据集没有细分肌群时兜底） */
  ids?: string[];
}

export const MUSCLES: Muscle[] = [
  { id: "chest", zh: "胸大肌", en: "Chest", part: "chest", keys: ["pectoral", "chest"] },
  { id: "shoulders", zh: "三角肌", en: "Delts", part: "shoulders", keys: ["deltoid", "delts"] },
  { id: "rear-delt", zh: "后束三角肌", en: "Rear delts", part: "shoulders", keys: ["rear delt", "rear deltoid", "後束"] },
  { id: "traps", zh: "斜方肌", en: "Traps", part: "back", keys: ["trap", "trapezius"] },
  { id: "lats", zh: "背阔肌", en: "Lats", part: "back", keys: ["lat", "背阔"] },
  {
    id: "teres",
    zh: "大圆肌 / 小圆肌",
    en: "Teres major / minor",
    part: "back",
    ids: ["0652", "0818", "2330", "1348", "0201", "0861", "1350", "0499", "0027", "0292"],
  },
  { id: "biceps", zh: "肱二头肌", en: "Biceps", part: "upper arms", keys: ["bicep", "brachialis"] },
  { id: "triceps", zh: "肱三头肌", en: "Triceps", part: "upper arms", keys: ["tricep"] },
  { id: "forearms", zh: "前臂", en: "Forearms", part: "lower arms" },
  { id: "abs", zh: "腹直肌", en: "Abs", part: "waist", keys: ["abs", "abdominal", "core"] },
  { id: "obliques", zh: "腹斜肌", en: "Obliques", part: "waist", keys: ["oblique", "twist"] },
  {
    id: "glute-max",
    zh: "臀大肌",
    en: "Glute max",
    part: "upper legs",
    keys: ["glute"],
    ids: ["1409", "3236", "0117", "3561", "3013", "0196", "2808"],
  },
  {
    id: "glute-med",
    zh: "臀中肌 / 小肌",
    en: "Glute med / min",
    part: "upper legs",
    ids: ["0597", "0710", "3006", "1774", "0410", "2368", "0336"],
  },
  { id: "quads", zh: "股四头肌", en: "Quads", part: "upper legs", keys: ["quad"] },
  { id: "hams", zh: "腘绳肌", en: "Hamstrings", part: "upper legs", keys: ["hamstring"] },
  { id: "calves", zh: "小腿", en: "Calves", part: "lower legs", keys: ["calf", "calves", "soleus"] },
  { id: "cardio", zh: "有氧", en: "Cardio", part: "cardio" },
];

const searchable = (ex: Exercise) =>
  [ex.target, ...(ex.secondary ?? []), ex.name, ex.zh ?? ""].join(" ").toLowerCase();

export function matchesMuscle(ex: Exercise, muscleId: string): boolean {
  const m = MUSCLES.find((x) => x.id === muscleId);
  if (!m) return true;
  if (m.ids?.includes(ex.id)) return true;
  if (m.keys?.length) {
    const hay = searchable(ex);
    if (m.keys.some((k) => hay.includes(k))) return true;
  }
  if (m.keys?.length || m.ids?.length) return false;
  return ex.bodyPart === m.part;
}

export const muscleZh = (id: string) => MUSCLES.find((m) => m.id === id)?.zh ?? id;
export const musclesOfPart = (part: string) => MUSCLES.filter((m) => m.part === part);
