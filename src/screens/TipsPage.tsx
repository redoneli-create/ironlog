import { useState } from "react";
import { TIPS, TIP_DISCLAIMER, TIP_TAGS, type Tip } from "../lib/tips";
import { Chip } from "../components/ui";

/** 女性健康小贴士：独立整页，不在底部菜单 */
export function TipsPage({ onClose }: { onClose: () => void }) {
  const [tag, setTag] = useState<string | null>(null);
  const [open, setOpen] = useState<Tip | null>(null);

  const list = TIPS.filter((t) => !tag || t.tag === tag);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto max-w-md px-4 pb-16 pt-5">
        <div className="flex items-center gap-3">
          <button
            onClick={open ? () => setOpen(null) : onClose}
            className="press flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-lg"
            aria-label="返回"
          >
            ‹
          </button>
          <div className="min-w-0">
            <div className="text-lg font-semibold">{open ? "小贴士" : "女性健康"}</div>
            <div className="text-[11px] text-muted">
              {open ? open.tag : "离线内置 " + TIPS.length + " 篇 · 不联网"}
            </div>
          </div>
        </div>

        {open ? (
          <article className="mt-5">
            <h1 className="text-2xl font-semibold leading-snug">{open.title}</h1>
            <div className="mt-2">
              <span className="rounded-md bg-accent/12 px-2 py-0.5 text-[11px] text-accent">{open.tag}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-ink/90">{open.body}</p>
            <div className="mt-6 rounded-xl bg-surface2 p-3 text-[12px] leading-6 text-muted">{TIP_DISCLAIMER}</div>
            <button
              onClick={() => setOpen(null)}
              className="press mt-5 w-full rounded-xl border border-line py-3 text-sm text-muted"
            >
              回到列表
            </button>
          </article>
        ) : (
          <>
            <div className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto pb-1">
              <Chip active={!tag} onClick={() => setTag(null)}>全部</Chip>
              {TIP_TAGS.map((t) => (
                <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                  {t}
                </Chip>
              ))}
            </div>

            <div className="mt-3 space-y-2.5">
              {list.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOpen(t)}
                  className="press block w-full rounded-2xl border border-line bg-surface p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[15px] font-semibold leading-snug">{t.title}</div>
                    <span className="shrink-0 rounded-md bg-accent/12 px-1.5 py-0.5 text-[10px] text-accent">
                      {t.tag}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-6 text-muted">{t.body}</p>
                </button>
              ))}
            </div>
            <p className="mt-5 text-center text-[11px] text-muted">{TIP_DISCLAIMER}</p>
          </>
        )}
      </div>
    </div>
  );
}
