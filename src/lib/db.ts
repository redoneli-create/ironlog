import Dexie, { type EntityTable } from "dexie";

export type BodyPart =
  | "chest"
  | "back"
  | "shoulders"
  | "upper arms"
  | "lower arms"
  | "upper legs"
  | "lower legs"
  | "waist"
  | "neck"
  | "cardio";

export interface TutorialLink {
  id: string;
  url: string;
  title: string;
  kind: "bili" | "douyin" | "web";
}

export interface Exercise {
  id: string;
  name: string;
  zh?: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondary: string[];
  isCustom: boolean;
  /** 口语/器械别名，参与搜索 */
  tags?: string[];
  links?: TutorialLink[];
}

export interface RoutineExercise {
  exerciseId: string;
  sets: number;
  reps: string;
  restSec: number;
  tempo?: string;
  /** 计划里的目标重量（kg），开始训练时预填 */
  weight?: number;
}

export interface Block {
  type: "single" | "superset";
  exercises: RoutineExercise[];
}

export interface Routine {
  id: string;
  name: string;
  blocks: Block[];
  /** 内置例程（来自种子） */
  official?: boolean;
  /** 女生专区 */
  female?: boolean;
}

export interface Program {
  id: string;
  name: string;
  weeks: number;
  routineIds: string[];
  note?: string;
  order?: number;
  official?: boolean;
  /** 显示在女生专区 */
  female?: boolean;
}

export interface SetLog {
  exerciseId: string;
  setNo: number;
  weight: number;
  reps: number;
  rpe?: number;
  doneAt: number;
}

export interface Session {
  id: string;
  programId?: string;
  routineId: string;
  date: string;
  startedAt: number;
  endedAt?: number;
  logs: SetLog[];
}

export interface BodyMetric {
  date: string;
  weight?: number;
  bodyFat?: number;
}

export interface Settings {
  key: "app";
  theme: string;
  accent?: string;
  wallpaper?: string;
  restDefault: number;
  unit: "kg" | "lb";
  seeded: number;
  /** 上次导出备份的时间戳 */
  lastExportAt?: number;
  /** 备份提醒先静音到这个时间 */
  backupSnoozeUntil?: number;
  /** 壁纸不透明度 0-100 */
  wallpaperOpacity?: number;
  /** 日历排期：日期 YYYY-MM-DD → 例程 id */
  schedule?: Record<string, string>;
  /** 每周固定安排：1-7（周一=1）→ 例程 id */
  weeklySchedule?: Record<string, string>;
}

export type DB = Dexie & {
  exercises: EntityTable<Exercise, "id">;
  routines: EntityTable<Routine, "id">;
  programs: EntityTable<Program, "id">;
  sessions: EntityTable<Session, "id">;
  metrics: EntityTable<BodyMetric, "date">;
  settings: EntityTable<Settings, "key">;
};

const schema = {
  exercises: "id, name, bodyPart, equipment",
  routines: "id, name",
  programs: "id, name",
  sessions: "id, date, routineId, programId",
  metrics: "date",
  settings: "key",
};

export const db = new Dexie("ironlog") as DB;
db.version(1).stores(schema);

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/** YYYY-MM-DD in the user's local timezone. */
export const localDate = (d: Date = new Date()) => {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10);
};

export const DEFAULT_SETTINGS: Settings = {
  key: "app",
  theme: "sakura",
  restDefault: 120,
  unit: "kg",
  seeded: 0,
};

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("app");
  if (s) return s;
  const next = { ...DEFAULT_SETTINGS };
  await db.settings.put(next);
  return next;
}

export const exerciseLabel = (e?: Exercise) => (e ? e.zh ?? e.name : "未知动作");

export const BODY_PARTS = [
  "chest",
  "back",
  "shoulders",
  "upper arms",
  "lower arms",
  "upper legs",
  "lower legs",
  "waist",
  "neck",
  "cardio",
] as const;

export const BODY_PART_ZH: Record<string, string> = {
  chest: "胸",
  back: "背",
  shoulders: "肩",
  "upper arms": "上臂",
  "lower arms": "前臂",
  "upper legs": "大腿",
  "lower legs": "小腿",
  waist: "核心",
  neck: "颈",
  cardio: "有氧",
};

export const EQUIPMENT_ZH: Record<string, string> = {
  "body weight": "自重", cable: "绳索", "leverage machine": "器械", assisted: "辅助",
  "medicine ball": "药球", "stability ball": "瑞士球", band: "弹力带", barbell: "杠铃",
  rope: "绳", dumbbell: "哑铃", "ez barbell": "曲杠", "sled machine": "雪橇机",
  "upper body ergometer": "手摇车", kettlebell: "壶铃", "olympic barbell": "奥杠",
  weighted: "负重", "bosu ball": "波速球", "resistance band": "弹力带", roller: "滚轮",
  "skierg machine": "滑雪机", hammer: "锤式", "smith machine": "史密斯",
  "wheel roller": "健腹轮", "stationary bike": "固定单车", tire: "轮胎",
  "trap bar": "六角杠", "elliptical machine": "椭圆机", "stepmill machine": "爬楼机",
  machine: "器械", custom: "自定义",
};

export const MUSCLE_ZH: Record<string, string> = {
  abs: "腹肌", quads: "股四头肌", lats: "背阔肌", calves: "小腿", pectorals: "胸大肌",
  glutes: "臀肌", hamstrings: "腘绳肌", adductors: "内收肌", triceps: "肱三头肌",
  "cardiovascular system": "心肺", spine: "脊柱", "upper back": "上背", biceps: "肱二头肌",
  delts: "三角肌", forearms: "前臂", traps: "斜方肌", "serratus anterior": "前锯肌",
  abductors: "外展肌", "levator scapulae": "肩胛提肌", "hip flexors": "髋屈肌",
  "lower back": "下背", obliques: "腹斜肌", rhomboids: "菱形肌", shoulders: "肩",
  core: "核心", back: "背", quadriceps: "股四头肌", chest: "胸", "rear deltoids": "后三角肌",
  trapezius: "斜方肌", "ankle stabilizers": "踝稳定肌", ankles: "踝", feet: "足",
  deltoids: "三角肌", brachialis: "肱肌", groin: "腹股沟", wrists: "腕",
  "rotator cuff": "肩袖", "upper chest": "上胸", "latissimus dorsi": "背阔肌",
  "wrist flexors": "腕屈肌", "wrist extensors": "腕伸肌", abdominals: "腹肌",
  "grip muscles": "握力肌", "lower abs": "下腹", "inner thighs": "大腿内侧",
  soleus: "比目鱼肌", sternocleidomastoid: "胸锁乳突肌", hands: "手", shins: "胫骨前肌",
};

export const equipmentZh = (v?: string) => (v ? EQUIPMENT_ZH[v] ?? v : "");
export const muscleZh = (v?: string) => (v ? MUSCLE_ZH[v] ?? v : "");
