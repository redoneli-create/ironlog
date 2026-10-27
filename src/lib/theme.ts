export interface ThemePreset {
  id: string;
  name: string;
  mode: "dark" | "light";
  accent: string;
}

export const PRESETS: ThemePreset[] = [
  { id: "iron", name: "铁黑", mode: "dark", accent: "#ff5a1f" },
  { id: "mint", name: "薄荷", mode: "dark", accent: "#2dd4a7" },
  { id: "ocean", name: "深海", mode: "dark", accent: "#4f8cff" },
  { id: "sand", name: "沙丘", mode: "light", accent: "#c2610c" },
  { id: "rose", name: "樱粉", mode: "light", accent: "#e0466b" },
];

export const presetOf = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];

const toRgb = (hex: string): [number, number, number] => {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const readableOn = (hex: string) => (luminance(hex) > 0.45 ? "#10151c" : "#ffffff");

export function applyTheme(themeId: string, accentOverride?: string) {
  const p = presetOf(themeId);
  const el = document.documentElement;
  const accent = accentOverride?.trim() || p.accent;
  el.dataset.theme = p.mode;
  el.style.setProperty("--accent", accent);
  el.style.setProperty("--onaccent", readableOn(accent));
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", p.mode === "dark" ? "#0b0f14" : "#f5f6f8");
}

export function applyWallpaper(dataUrl?: string) {
  const el = document.documentElement;
  if (dataUrl) {
    el.style.setProperty("--wallpaper", "url(" + dataUrl + ")");
    el.dataset.wallpaper = "on";
  } else {
    el.style.removeProperty("--wallpaper");
    delete el.dataset.wallpaper;
  }
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Dominant + accent colors from a wallpaper, via 48x48 canvas quantisation. */
export async function extractPalette(src: string): Promise<{ dominant: string; accent: string }> {
  const img = await loadImage(src);
  const n = 48;
  const canvas = document.createElement("canvas");
  canvas.width = n;
  canvas.height = n;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, n, n);
  const { data } = ctx.getImageData(0, 0, n, n);

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 125) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    cur.r += r;
    cur.g += g;
    cur.b += b;
    cur.n += 1;
    buckets.set(key, cur);
  }
  if (!buckets.size) return { dominant: "#0b0f14", accent: "#ff5a1f" };

  const list = [...buckets.values()]
    .map((c) => ({ hex: toHex(c.r / c.n, c.g / c.n, c.b / c.n), count: c.n }))
    .sort((a, b) => b.count - a.count);

  const dominant = list[0].hex;
  let accent = dominant;
  let best = 0;
  for (const c of list.slice(0, 40)) {
    const [r, g, b] = toRgb(c.hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = luminance(c.hex);
    if (sat < 0.22 || lum < 0.12 || lum > 0.82) continue;
    const score = sat * 1.6 + Math.min(c.count, 120) / 120;
    if (score > best) {
      best = score;
      accent = c.hex;
    }
  }
  return { dominant, accent };
}
