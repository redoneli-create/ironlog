import RAW from "./exercises.json";
import { ALIASES } from "./aliases";
import { biliSearch } from "../lib/tutorials";
import {
  db,
  getSettings,
  type Block,
  type Exercise,
  type Program,
  type Routine,
  type RoutineExercise,
  type TutorialLink,
} from "../lib/db";

type RawExercise = { id: string; name: string; zh?: string; bp: string; eq: string; tg: string; sec: string[] };

const SUPPLEMENT: Exercise[] = [
  { id: "x-plank", name: "plank", zh: "平板支撑", bodyPart: "waist", equipment: "body weight", target: "abs", secondary: ["shoulders"], isCustom: false, tags: ["平板", "核心"] },
  { id: "x-face-pull", name: "face pull", zh: "面拉", bodyPart: "shoulders", equipment: "cable", target: "rear deltoid", secondary: ["traps"], isCustom: false, tags: ["面拉", "后束"] },
];

export const DATASET: Exercise[] = (RAW as RawExercise[]).map((e) => {
  const alias = ALIASES[e.id];
  return {
    id: e.id,
    name: e.name,
    zh: alias?.zh ?? e.zh,
    bodyPart: e.bp,
    equipment: e.eq,
    target: e.tg,
    secondary: e.sec,
    isCustom: false,
    ...(alias?.tags?.length ? { tags: alias.tags } : {}),
  };
});

/** 内置计划涉及的动作，首次启动自动挂一个 B 站教程搜索链接（可删可替换）。 */
const TUTORIAL_IDS = new Set([
  "0043", "0025", "0027", "0032", "0091", "0662", "0652", "0336", "0294", "0085",
  "0585", "0586", "1372", "0314", "0292", "0334", "0380", "0165", "0200", "0599",
  "0088", "0472", "0861", "0383", "0031", "0194", "0760", "1760", "0289", "0426",
  "0313", "0276", "0499", "1459", "0406", "0241", "0117", "1409", "0597", "0410",
  "0196", "0710", "2287", "1299", "0818", "0417",
  "x-plank", "x-face-pull",
]);

const seedLink = (ex: Exercise): TutorialLink[] => {
  const kw = (ex.zh ?? ex.name) + " 教程";
  return [{ id: "t-" + ex.id, url: biliSearch(kw), title: "B站搜索 · " + (ex.zh ?? ex.name), kind: "bili" }];
};

const slot = (exerciseId: string, sets: number, reps: string, restSec: number, tempo?: string): RoutineExercise => ({
  exerciseId,
  sets,
  reps,
  restSec,
  ...(tempo ? { tempo } : {}),
});
const single = (...exercises: RoutineExercise[]): Block => ({ type: "single", exercises });
const superset = (...exercises: RoutineExercise[]): Block => ({ type: "superset", exercises });
const routine = (id: string, name: string, blocks: Block[]): Routine => ({ id, name, blocks });
const prog = (id: string, name: string, weeks: number, routineIds: string[], note: string, order: number): Program => ({
  id,
  name,
  weeks,
  routineIds,
  note,
  order,
});

const RAW_ROUTINES: Routine[] = [
  routine("r-fb-a", "全身 A", [
    single(slot("0043", 3, "5", 180)),
    single(slot("0025", 3, "5", 180)),
    single(slot("0027", 3, "8", 120)),
    single(slot("0091", 3, "8", 120)),
    single(slot("x-plank", 3, "45s", 60)),
  ]),
  routine("r-fb-b", "全身 B", [
    single(slot("0032", 3, "5", 180)),
    single(slot("0662", 3, "12", 90)),
    single(slot("0652", 3, "5", 120)),
    single(slot("0336", 3, "10", 90)),
    single(slot("0294", 3, "12", 60)),
    single(slot("0274", 3, "15", 45)),
  ]),
  routine("r-ul-u1", "上肢 A", [
    single(slot("0025", 4, "6", 180)),
    single(slot("0027", 4, "8", 120)),
    single(slot("0091", 3, "8", 120)),
    single(slot("0652", 3, "6", 120)),
    single(slot("0241", 3, "12", 60)),
    single(slot("0294", 3, "12", 60)),
  ]),
  routine("r-ul-l1", "下肢 A", [
    single(slot("0043", 4, "5", 180)),
    single(slot("0085", 3, "8", 120)),
    single(slot("0585", 3, "12", 60)),
    single(slot("0586", 3, "12", 60)),
    single(slot("1372", 4, "15", 45)),
  ]),
  routine("r-ul-u2", "上肢 B", [
    single(slot("0314", 4, "8", 120)),
    single(slot("0292", 4, "10", 90)),
    single(slot("0334", 3, "15", 60)),
    single(slot("0380", 3, "15", 60)),
    single(slot("0165", 3, "12", 60)),
    single(slot("0200", 3, "12", 60)),
  ]),
  routine("r-ul-l2", "下肢 B", [
    single(slot("0032", 4, "5", 180)),
    single(slot("0336", 3, "10", 90)),
    single(slot("0599", 3, "12", 60)),
    single(slot("0088", 4, "15", 45)),
    single(slot("0472", 3, "12", 60)),
  ]),
  routine("r-ppl-push", "推 · Push", [
    single(slot("0025", 4, "6", 180)),
    single(slot("0314", 3, "8", 120)),
    single(slot("0091", 3, "8", 120)),
    single(slot("0334", 3, "15", 60)),
    single(slot("0241", 3, "12", 60)),
    single(slot("0194", 3, "12", 60)),
  ]),
  routine("r-ppl-pull", "拉 · Pull", [
    single(slot("0032", 3, "5", 180)),
    single(slot("0652", 4, "6", 120)),
    single(slot("0861", 3, "10", 90)),
    single(slot("0383", 3, "15", 60)),
    single(slot("0165", 3, "12", 60)),
    single(slot("0031", 3, "10", 60)),
  ]),
  routine("r-ppl-legs", "腿 · Legs", [
    single(slot("0043", 4, "6", 180)),
    single(slot("0085", 3, "8", 120)),
    single(slot("0760", 3, "12", 90)),
    single(slot("0599", 3, "12", 60)),
    single(slot("1372", 4, "15", 45)),
    single(slot("0472", 3, "12", 60)),
  ]),
  routine("r-db-a", "哑铃 A", [
    single(slot("1760", 3, "12", 90)),
    single(slot("0289", 3, "10", 90)),
    single(slot("0292", 3, "10", 90)),
    single(slot("0426", 3, "10", 90)),
    single(slot("0313", 3, "12", 60)),
    single(slot("0276", 3, "10", 45)),
  ]),
  routine("r-db-b", "哑铃 B", [
    superset(slot("0662", 3, "15", 45), slot("0499", 3, "12", 90)),
    superset(slot("0336", 3, "10", 45), slot("0334", 3, "15", 90)),
    single(slot("1459", 3, "12", 90)),
    single(slot("0406", 3, "15", 60)),
    single(slot("x-plank", 3, "45s", 45)),
  ]),
  routine("r-fem-a", "臀腿 A", [
    single(slot("1409", 4, "10", 120)),
    single(slot("0117", 3, "8", 120)),
    single(slot("0597", 3, "15", 60)),
    single(slot("0410", 3, "10", 90)),
    single(slot("0196", 3, "15", 60)),
  ]),
  routine("r-fem-b", "臀腿 B", [
    single(slot("2287", 3, "12", 90)),
    single(slot("0586", 3, "12", 60)),
    single(slot("0710", 3, "20", 45)),
    single(slot("0417", 4, "15", 45)),
    single(slot("0043", 3, "8", 120)),
    single(slot("0472", 3, "12", 60)),
  ]),
  routine("r-fem-c", "全身 A", [
    single(slot("1760", 3, "12", 90)),
    single(slot("0289", 3, "10", 90)),
    single(slot("0861", 3, "12", 90)),
    single(slot("1459", 3, "10", 90)),
    single(slot("0334", 3, "15", 60)),
    single(slot("0276", 3, "12", 45)),
  ]),
  routine("r-fem-glute-c", "臀部强化", [
    single(slot("1409", 4, "10", 120)),
    single(slot("0117", 3, "8", 120)),
    single(slot("0381", 3, "10", 90)),
    single(slot("0597", 3, "15", 60)),
    single(slot("0417", 4, "15", 45)),
  ]),
  routine("r-fem-upper-a", "上肢线条", [
    single(slot("0289", 3, "10", 90)),
    single(slot("0818", 3, "12", 90)),
    single(slot("0334", 3, "15", 60)),
    single(slot("0241", 3, "12", 60)),
    single(slot("0383", 3, "15", 60)),
  ]),
  routine("r-fem-core", "核心", [
    single(slot("0276", 3, "12", 45)),
    single(slot("0274", 3, "15", 45)),
    single(slot("0472", 3, "12", 60)),
    single(slot("x-plank", 3, "45s", 45)),
  ]),
  routine("r-fem-d", "全身 B", [
    single(slot("2287", 3, "12", 90)),
    single(slot("1299", 3, "10", 90)),
    single(slot("0818", 3, "12", 90)),
    single(slot("0085", 3, "10", 120)),
    single(slot("0313", 3, "12", 60)),
    single(slot("x-plank", 3, "45s", 45)),
  ]),
];

export const ROUTINES: Routine[] = RAW_ROUTINES.map((r) => ({
  ...r,
  official: true,
  female: r.id.startsWith("r-fem"),
}));

export const PROGRAMS: Program[] = [
  prog("p-fb", "新手全身", 8, ["r-fb-a", "r-fb-b"], "每周 3 练，A/B 交替", 1),
  prog("p-ul", "上下肢分化", 8, ["r-ul-u1", "r-ul-l1", "r-ul-u2", "r-ul-l2"], "每周 4 练", 2),
  prog("p-ppl", "PPL 推拉腿", 12, ["r-ppl-push", "r-ppl-pull", "r-ppl-legs"], "每周 6 练或 3 练轮转", 3),
  prog("p-db", "哑铃自重", 6, ["r-db-a", "r-db-b"], "家庭器械最小化", 4),
  prog("p-fem-glute", "女性 · 臀腿塑形", 8, ["r-fem-a", "r-fem-b"], "每周 2–3 练，臀腿优先", 5),
  prog("p-fem-full", "女性 · 全身塑形", 6, ["r-fem-c", "r-fem-d"], "每周 3 练轮换，线条优先", 6),
  prog("p-fem-shape", "女性 · 三练塑形", 8, ["r-fem-c", "r-fem-upper-a", "r-fem-core"], "臀腿 + 上肢 + 核心，一周三轮", 7),
].map((p) => ({ ...p, official: true, female: p.id.startsWith("p-fem") }));


export const SEED_VERSION = 4;

let seeded = false;

export async function ensureSeed(): Promise<void> {
  if (seeded) return;
  const settings = await getSettings();
  if (settings.seeded >= SEED_VERSION) {
    seeded = true;
    return;
  }

  // 保留用户已添加的教程链接，其余元数据跟随内置数据更新
  const existing = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
  const merged: Exercise[] = [...DATASET, ...SUPPLEMENT].map((ex) => {
    const prev = existing.get(ex.id);
    const links = prev?.links?.length ? prev.links : TUTORIAL_IDS.has(ex.id) ? seedLink(ex) : undefined;
    return { ...ex, ...(prev?.isCustom ? { isCustom: true } : {}), ...(links ? { links } : {}) };
  });

  await db.transaction("rw", db.exercises, db.routines, db.programs, db.settings, async () => {
    await db.exercises.bulkPut(merged);
    await db.routines.bulkPut(ROUTINES);
    await db.programs.bulkPut(PROGRAMS);
    await db.settings.update("app", { seeded: SEED_VERSION });
  });
  seeded = true;
}
