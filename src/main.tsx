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
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapApp } from "@capacitor/app";
import { runBack } from "./lib/backstack";

type Tab = "train" | "plans" | "library" | "body" | "me";

const TABS: { id: Tab; label: string }[] = [
  { id: "train", label: "训练" },
  { id: "plans", label: "计划" },
  { id: "library", label: "动作" },
  { id: "body", label: "数据" },
  { id: "me", label: "我的" },
];

function TabIcon({ id }: { id: Tab }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (id === "train")
    return (
      <svg {...common}>
        <path d="M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11" />
      </svg>
    );
  if (id === "plans")
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M8 3v4M16 3v4M3.5 10h17M7.5 14h3M13.5 14h3M7.5 17.5h3" />
      </svg>
    );
  if (id === "library")
    return (
      <svg {...common}>
        <path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01" />
      </svg>
    );
  if (id === "body")
    return (
      <svg {...common}>
        <path d="M3.5 3.5v17h17" />
        <path d="M7 15l3.5-4.5 3 2.5 4.5-6" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20.5c0-3.9 3.4-6 7.5-6s7.5 2.1 7.5 6" />
    </svg>
  );
}

function App() {
  const [tab, setTab] = useState<Tab>("train");
  const settings = useLiveQuery(() => db.settings.get("app"), []);

  useEffect(() => {
    void ensureSeed();
    if (!Capacitor.isNativePlatform()) return;
    void StatusBar.setOverlaysWebView({ overlay: false });
    void StatusBar.setStyle({ style: Style.Dark });
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let handle: { remove: () => void } | undefined;
    void CapApp.addListener("backButton", ({ canGoBack }) => {
      if (runBack()) return;
      if (tab !== "train") {
        setTab("train");
        return;
      }
      if (canGoBack) window.history.back();
      else void CapApp.exitApp();
    }).then((h) => {
      handle = h;
      if (disposed) void h.remove();
    });
    return () => {
      disposed = true;
      void handle?.remove();
    };
  }, [tab]);

  useEffect(() => {
    if (!settings) return;
    applyTheme(settings.theme, settings.accent);
    applyWallpaper(settings.wallpaper, settings.wallpaperOpacity);
  }, [settings?.theme, settings?.accent, settings?.wallpaper, settings?.wallpaperOpacity]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-bg/80 px-4 py-3 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black leading-none tracking-tight">练</span>
          <span className="text-[12px] text-muted">离线训练记录</span>
        </div>
        <span className="text-[12px] text-muted tabular-nums">{localDate()}</span>
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
                aria-label={t.label}
                className={
                  "flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 pb-1.5 pt-2 text-[12px] font-medium " +
                  (active ? "text-accent" : "text-muted")
                }
              >
                <TabIcon id={t.id} />
                <span>{t.label}</span>
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
