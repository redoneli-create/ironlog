import { useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Settings } from "../lib/db";
import { PRESETS, applyTheme, applyWallpaper, extractPalette, presetOf } from "../lib/theme";
import { clearAll, exportCSV, exportJSON, importCSV, importJSON, type CsvMap } from "../lib/backup";
import { Btn, Card, Chip, SectionTitle } from "../components/ui";

const REST_OPTIONS = [45, 60, 90, 120, 180, 240];

function FileBtn(props: { accept: string; onFile: (f: File) => void; children: ReactNode }) {
  return (
    <label className="press block w-full cursor-pointer rounded-xl border border-line bg-surface2 py-3.5 text-center text-sm font-semibold">
      {props.children}
      <input
        type="file"
        accept={props.accept}
        className="hidden"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (f) props.onFile(f);
        }}
      />
    </label>
  );
}

const shrink = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    img.src = url;
  });

export function MeScreen() {
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [map, setMap] = useState<CsvMap>("strong");

  const patch = (p: Partial<Settings>) => db.settings.update("app", p);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg(label + "…");
    try {
      await fn();
      setMsg(label + "完成");
    } catch (e) {
      setMsg(label + "失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const theme = settings?.theme ?? "iron";
  const accent = settings?.accent ?? presetOf(theme).accent;

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle>主题</SectionTitle>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => void patch({ theme: p.id, accent: undefined })}
              className={
                "press rounded-xl border py-2 text-[11px] " + (theme === p.id ? "border-accent" : "border-line")
              }
            >
              <span className="mx-auto mb-1 block h-5 w-5 rounded-full" style={{ background: p.accent }} />
              {p.name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-surface2 px-3 py-2">
          <span className="text-xs text-muted">自定义强调色</span>
          <input
            type="color"
            value={accent}
            onChange={(e) => void patch({ accent: e.target.value })}
            className="h-9 w-14 rounded-lg border border-line bg-transparent"
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <FileBtn
            accept="image/*"
            onFile={(f) =>
              void run("壁纸取色", async () => {
                const data = await shrink(f);
                const pal = await extractPalette(data);
                await patch({ wallpaper: data, accent: pal.accent });
                applyWallpaper(data);
                applyTheme(theme, pal.accent);
              })
            }
          >
            上传壁纸
          </FileBtn>
          <Btn
            kind="ghost"
            className="py-3.5"
            onClick={() => {
              applyWallpaper(undefined);
              void patch({ wallpaper: undefined });
            }}
          >
            移除壁纸
          </Btn>
        </div>
        <p className="mt-2 text-[11px] text-muted">取色取壁纸主色与最饱和色，自动设为强调色。</p>
      </Card>

      <Card>
        <SectionTitle>训练</SectionTitle>
        <div className="mt-2 text-[11px] text-muted">默认组间休息</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {REST_OPTIONS.map((s) => (
            <Chip
              key={s}
              active={(settings?.restDefault ?? 120) === s}
              onClick={() => void patch({ restDefault: s })}
            >
              {s}s
            </Chip>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-muted">单位</div>
        <div className="mt-1.5 flex gap-1.5">
          {(["kg", "lb"] as const).map((u) => (
            <Chip key={u} active={(settings?.unit ?? "kg") === u} onClick={() => void patch({ unit: u })}>
              {u}
            </Chip>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle right={<span className="text-[11px] text-muted">{busy ? "处理中…" : msg}</span>}>
          备份与导入
        </SectionTitle>
        <div className="mt-3 space-y-2">
          <Btn onClick={() => void run("导出 JSON", exportJSON)}>导出全部数据（JSON）</Btn>
          <Btn kind="ghost" onClick={() => void run("导出 CSV", exportCSV)}>
            导出训练记录（CSV）
          </Btn>
          <FileBtn
            accept=".json,application/json"
            onFile={(f) =>
              void run("导入 JSON", async () => {
                await importJSON(f);
                location.reload();
              })
            }
          >
            导入 JSON（覆盖全部）
          </FileBtn>
          <div className="flex gap-2">
            <select
              value={map}
              onChange={(e) => setMap(e.target.value as CsvMap)}
              className="h-12 flex-1 rounded-xl border border-line bg-surface2 px-2 text-xs text-ink"
            >
              <option value="strong">Strong 格式</option>
              <option value="fitnotes">FitNotes 格式</option>
            </select>
            <div className="flex-1">
              <FileBtn
                accept=".csv,text/csv"
                onFile={(f) =>
                  void run("导入 CSV", async () => {
                    await importCSV(f, map);
                    location.reload();
                  })
                }
              >
                导入 CSV
              </FileBtn>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          列映射：日期 / 动作 / 重量 / 次数；Strong 取 Workout Name 与 Set Order，FitNotes 用日期分组。
        </p>
      </Card>

      <Card>
        <SectionTitle>危险操作</SectionTitle>
        <Btn
          kind="ghost"
          className="mt-3 text-muted"
          onClick={() => {
            if (confirm("清空本机所有训练、动作与设置？不可恢复。")) {
              void clearAll().then(() => location.reload());
            }
          }}
        >
          清空全部数据
        </Btn>
      </Card>

      <p className="pb-2 text-center text-[11px] text-muted">练 v0.3 · MIT · 数据仅存本机</p>
    </div>
  );
}
