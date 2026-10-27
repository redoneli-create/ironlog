import { useState } from "react";
import { addTutorial, kindLabel, normalizeUrl, removeTutorial } from "../lib/tutorials";
import type { Exercise } from "../lib/db";
import { TextInput } from "./ui";
import { toast } from "../lib/toast";

export function TutorialList({ exercise, editable = false }: { exercise: Exercise; editable?: boolean }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");
  const links = exercise.links ?? [];

  const add = async () => {
    const u = normalizeUrl(url);
    if (!u) {
      setErr("链接格式不对，需要 http(s) 地址");
      return;
    }
    setErr("");
    await addTutorial(exercise, u, title);
    setUrl("");
    setTitle("");
  };

  return (
    <div>
      <div className="text-[12px] text-muted">教程链接</div>
      <div className="mt-1.5 space-y-1.5">
        {links.map((l) => (
          <div key={l.id} className="flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2">
            <span className="shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 text-[12px] text-accent">
              {kindLabel[l.kind]}
            </span>
            <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs">
              {l.title}
            </a>
            {editable && (
              <button
                onClick={() => {
                  void removeTutorial(exercise, l.id).then(() =>
                    toast("已删除链接", "撤销", () => void addTutorial(exercise, l.url, l.title)),
                  );
                }}
                className="shrink-0 px-1 text-xs text-muted"
                aria-label="删除链接"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {!links.length && <p className="text-[12px] text-muted">还没有教程，可粘贴 B 站 / 抖音 视频链接</p>}
      </div>

      {editable && (
        <div className="mt-2 space-y-2">
          <TextInput value={url} onChange={setUrl} placeholder="粘贴链接，如 https://www.bilibili.com/video/BV…" />
          <div className="flex gap-2">
            <TextInput value={title} onChange={setTitle} placeholder="标题（可选）" />
            <button
              onClick={() => void add()}
              className="press shrink-0 rounded-xl bg-accent px-3 text-xs font-semibold text-onaccent"
            >
              添加
            </button>
          </div>
          {err && <p className="text-[12px] text-accent">{err}</p>}
        </div>
      )}
    </div>
  );
}
