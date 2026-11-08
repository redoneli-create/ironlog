import { useRef, useState } from "react";

/** 9:16 自由裁剪：拖动平移、按钮缩放，确认后输出 1080×1920 JPEG */
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
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  };
  const onUp = () => {
    drag.current = null;
  };

  const confirm = async () => {
    const box = boxRef.current;
    if (!box) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = src;
      await img.decode();
      const cw = box.clientWidth;
      const ch = box.clientHeight;
      const k = 1080 / cw;
      const s0 = Math.max(cw / img.width, ch / img.height);
      const s = s0 * zoom;
      const dx = (cw - img.width * s) / 2 + offset.x;
      const dy = (ch - img.height * s) / 2 + offset.y;
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, dx * k, dy * k, img.width * s * k, img.height * s * k);
      onDone(canvas.toDataURL("image/jpeg", 0.85));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onCancel} className="text-sm text-white/80">
          取消
        </button>
        <span className="text-sm">拖动调整位置，缩放取景</span>
        <button onClick={() => void confirm()} disabled={busy} className="text-sm font-semibold text-accent">
          {busy ? "处理中…" : "使用"}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <div
          ref={boxRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="relative aspect-[9/16] max-h-[70vh] w-full max-w-[340px] touch-none overflow-hidden rounded-2xl bg-black"
        >
          <img
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
            style={{
              transform:
                "translate(-50%, -50%) translate(" + offset.x + "px," + offset.y + "px) scale(" + zoom + ")",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-white/40" />
        </div>
      </div>

      <div className="flex items-center gap-3 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
        <button
          onClick={() => setZoom((z) => Math.max(1, +(z - 0.15).toFixed(2)))}
          className="h-11 w-11 rounded-xl bg-white/10 text-lg text-white"
        >
          −
        </button>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
        <button
          onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))}
          className="h-11 w-11 rounded-xl bg-white/10 text-lg text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}
