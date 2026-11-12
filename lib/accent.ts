export const IRIS = "#A7B4F3";
export const validColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
export function hslToHex(h: number, s: number, l = 80) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0"); };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}
export function hexToHsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  let h = 0;
  if (d) h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return { h, s: d ? d / (1 - Math.abs(2 * l - 1)) * 100 : 0, l: l * 100 };
}
// Self-contained so the same contrast-safe tokens can run before hydration.
export function accentTokens(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) hex = "#A7B4F3";
  const rgb = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  const lum = (value: string) => rgb(value).map((n) => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (target: number, t: number) => "#" + rgb(hex).map((n) => Math.round(n * (1 - t) + target * t).toString(16).padStart(2, "0")).join("");
  const readable = (background: string, target: number) => { for (let i = 0; i <= 50; i++) { const color = mix(target, i / 50); if (contrast(color, background) >= 4.5) return color; } return mix(target, 1); };
  const inks = ["#121b22", "#ffffff", "#000000"].sort((a, b) => contrast(b, hex) - contrast(a, hex));
  return { "--custom-action": hex, "--custom-hover": mix(lum(hex) > .5 ? 0 : 255, .08), "--custom-ink": inks[0], "--custom-accent-dark": readable("#121b22", 255), "--custom-accent-light": readable("#f8f3e9", 0) };
}
export function applyAccent(accent?: string, color?: string) {
  const root = document.documentElement;
  root.dataset.accent = accent ?? "iris";
  if (accent === "custom" && validColor(color)) for (const [key, value] of Object.entries(accentTokens(color))) root.style.setProperty(key, value);
}
