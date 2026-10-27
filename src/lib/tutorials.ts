import { db, exerciseLabel, uid, type Exercise, type TutorialLink } from "./db";

export const linkKind = (url: string): TutorialLink["kind"] => {
  if (/bilibili\.com|b23\.tv/i.test(url)) return "bili";
  if (/douyin\.com|iesdouyin\.com/i.test(url)) return "douyin";
  return "web";
};

export const kindLabel: Record<TutorialLink["kind"], string> = {
  bili: "B站",
  douyin: "抖音",
  web: "网页",
};

export function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : "https://" + v;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function addTutorial(exercise: Exercise, url: string, title: string): Promise<void> {
  const link: TutorialLink = {
    id: uid(),
    url,
    title: title.trim() || exerciseLabel(exercise) + " 教程",
    kind: linkKind(url),
  };
  await db.exercises.update(exercise.id, { links: [...(exercise.links ?? []), link] });
}

export async function removeTutorial(exercise: Exercise, linkId: string): Promise<void> {
  await db.exercises.update(exercise.id, {
    links: (exercise.links ?? []).filter((l) => l.id !== linkId),
  });
}

export const biliSearch = (q: string) => "https://search.bilibili.com/all?keyword=" + encodeURIComponent(q);
