import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useLiveQuery } from "dexie-react-hooks";
import "./index.css";
import { db, localDate } from "./lib/db";
import { ensureSeed } from "./data/seeds";
import { applyTheme, applyWallpaper } from "./lib/theme";
import { TrainScreen } from "./screens/Train";
import { PlansScreen } from "./screens/Plans";
import { LibraryScreen } from "./screens/Library";
import { DataScreen } from "./screens/Data";
import { MeScreen } from "./screens/Me";
import { Toasts } from "./components/Toasts";

type Tab = "train" | "plans" | "library" | "body" | "me";

const TABS: { id: Tab; label: string }[] = [
  { id: "train", label: "训练" },
  { id: "plans", label: "计划" },
  { id: "library", label: "动作" },
  { id: "body", label: "数据" },
  { id: "me", label: "我的" },
];

function App() {
  const [tab, setTab] = useState<Tab>("train");
  const settings = useLiveQuery(() => db.settings.get("app"), []);

  useEffect(() => {
    void ensureSeed();
  }, []);

  useEffect(() => {
    if (!settings) return;
    applyTheme(settings.theme, settings.accent);
    applyWallpaper(settings.wallpaper);
  }, [settings?.theme, settings?.accent, settings?.wallpaper]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-bg/80 px-4 py-3 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black leading-none tracking-tight">练</span>
          <span className="text-[11px] text-muted">离线训练记录</span>
        </div>
        <span className="text-[11px] text-muted tabular-nums">{localDate()}</span>
      </header>

      <main className="flex-1 px-4 pb-28">
        {tab === "train" && <TrainScreen />}
        {tab === "plans" && <PlansScreen onStart={() => setTab("train")} />}
        {tab === "library" && <LibraryScreen />}
        {tab === "body" && <DataScreen />}
        {tab === "me" && <MeScreen />}
      </main>

      <nav className="pad-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  "flex-1 py-3 text-[11px] font-medium " + (active ? "text-accent" : "text-muted")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
      <Toasts />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
