import { useEffect, useRef, useState } from "react";

interface Pt {
  id: number;
  x: number;
  y: number;
}

/** 9:16 自由裁剪：单指拖动、双指缩放，底部「完成」输出 1080×1920 */
export function ImageCropper({
  src,
  onCancel,
  onDone,
}: {
  src: string;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pointers = useRef<Map<number, Pt>>(new Map());
  const gesture = useRef<{ dist: number; zoom: number; cx: number; cy: number; ox: number; oy: number } | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      imgRef.current = img;
      setState("ready");
    };
    img.onerror = () => {
      if (alive) setState("error");
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  const distance = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  const center = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      const c = center(pts[0], pts[1]);
      gesture.current = {
        dist: distance(pts[0], pts[1]),
        zoom,
        cx: c.x,
        cy: c.y,
        ox: offset.x,
        oy: offset.y,
      };
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];

    if (pts.length >= 2) {
      const g = gesture.current;
      if (!g) return;
      const d = distance(pts[0], pts[1]);
      const c = center(pts[0], pts[1]);
      const next = Math.min(4, Math.max(1, (g.zoom * d) / Math.max(1, g.dist)));
      setZoom(next);
      setOffset({ x: g.ox + (c.x - g.cx), y: g.oy + (c.y - g.cy) });
      return;
    }

    setOffset((o) => ({ x: o.x + (e.clientX - prev.x), y: o.y + (e.clientY - prev.y) }));
  };

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  };

  const confirm = async () => {
    const box = boxRef.current;
    const img = imgRef.current;
    if (!box || !img || state !== "ready") return;
    setBusy(true);
    try {
      const cw = box.clientWidth;
      const ch = box.clientHeight;
      const k = 1080 / cw;
      const base = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const s = base * zoom;
      const dx = (cw - img.naturalWidth * s) / 2 + offset.x;
      const dy = (ch - img.naturalHeight * s) / 2 + offset.y;
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 1080, 1920);
      ctx.drawImage(img, dx * k, dy * k, img.naturalWidth * s * k, img.naturalHeight * s * k);
      onDone(canvas.toDataURL("image/jpeg", 0.85));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onCancel} className="text-sm text-white/80">
          取消
        </button>
        <span className="text-[12px] text-white/70">单指拖动 · 双指缩放</span>
        <span className="w-10" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <div
          ref={boxRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          className="relative aspect-[9/16] max-h-[62vh] w-full max-w-[340px] touch-none select-none overflow-hidden rounded-2xl bg-black"
        >
          <img
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 w-full select-none"
            style={{
              transform:
                "translate(-50%, -50%) translate(" + offset.x + "px," + offset.y + "px) scale(" + zoom + ")",
              objectFit: "cover",
              height: "100%",
              opacity: state === "ready" ? 1 : 0,
            }}
          />
          {state === "loading" && (
            <div className="absolute inset-0 grid place-items-center text-[12px] text-white/70">读取图片…</div>
          )}
          {state === "error" && (
            <div className="absolute inset-0 grid place-items-center px-6 text-center text-[12px] text-white/80">
              这张图片无法读取（可能是 HEIC 等格式），换一张 JPG/PNG 试试
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/30" />
        </div>
      </div>

      <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
            className="h-10 w-10 rounded-lg bg-white/10 text-lg text-white"
          >
            −
          </button>
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[var(--accent)]"
          />
          <button
            onClick={() => setZoom((z) => Math.min(4, +(z + 0.2).toFixed(2)))}
            className="h-10 w-10 rounded-lg bg-white/10 text-lg text-white"
          >
            +
          </button>
        </div>
        <button
          onClick={() => void confirm()}
          disabled={state !== "ready" || busy}
          className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-onaccent disabled:opacity-40"
        >
          {busy ? "处理中…" : "完成裁剪"}
        </button>
      </div>
    </div>
  );
}
