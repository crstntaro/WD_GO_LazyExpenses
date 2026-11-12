"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { applyAccent, hexToHsl, hslToHex, IRIS, validColor } from "@/lib/accent";
import type { Setup } from "@/lib/setup-store";

export function ColorWheel({ setup, update }: { setup: Setup; update: (patch: Partial<Setup>) => void }) {
  const current = setup.accent === "custom" && validColor(setup.accentColor) ? setup.accentColor : setup.accent === "coral" ? "#FF805F" : setup.accent === "lime" ? "#E6F4C0" : IRIS;
  const [color, setColor] = useState(current);
  const [lastHue, setLastHue] = useState(hexToHsl(current).h);
  const [hex, setHex] = useState(current);
  const [error, setError] = useState("");
  const wheel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const derived = hexToHsl(color);
  const hsl = { ...derived, h: derived.s > .001 ? derived.h : lastHue };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (pending.current) update({ accent: "custom", accentColor: pending.current }); }, [update]);
  useEffect(() => {
    if (pending.current) return;
    const frame = requestAnimationFrame(() => { setColor(current); setHex(current); const next = hexToHsl(current); if (next.s > .001) setLastHue(next.h); });
    return () => cancelAnimationFrame(frame);
  }, [current]);
  function choose(value: string) {
    setColor(value); setHex(value); if (hexToHsl(value).s > .001) setLastHue(hexToHsl(value).h); setError(""); applyAccent("custom", value);
    pending.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { update({ accent: "custom", accentColor: value }); pending.current = null; }, 120);
  }
  function point(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2, y = event.clientY - bounds.top - bounds.height / 2;
    const hue = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; setLastHue(hue);
    choose(hslToHex(hue, Math.min(100, Math.hypot(x, y) / (bounds.width / 2) * 100)));
  }
  return <fieldset className="accent-picker"><legend>Accent color</legend><div className="color-wheel-layout">
    <div ref={wheel} className="color-wheel" role="slider" tabIndex={0} aria-label="Accent hue" aria-valuemin={0} aria-valuemax={359} aria-valuenow={Math.round(hsl.h) % 360} aria-valuetext={`Hue ${Math.round(hsl.h)} degrees, strength ${Math.round(hsl.s)} percent`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); point(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) point(event); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onKeyDown={(event) => {
      const step = event.shiftKey ? 10 : 1;
      const next = event.key === "Home" ? 0 : event.key === "End" ? 359 : ["ArrowRight", "ArrowUp"].includes(event.key) ? (hsl.h + step) % 360 : ["ArrowLeft", "ArrowDown"].includes(event.key) ? (hsl.h - step + 360) % 360 : null;
      if (next !== null) { event.preventDefault(); setLastHue(next); choose(hslToHex(next, hsl.s)); }
    }}><span className="wheel-knob" style={{ left: `${50 + Math.cos(hsl.h * Math.PI / 180) * hsl.s / 2}%`, top: `${50 + Math.sin(hsl.h * Math.PI / 180) * hsl.s / 2}%`, background: color }} /></div>
    <div className="color-wheel-controls"><label htmlFor="accent-strength">Color strength</label><input id="accent-strength" type="range" min={0} max={100} value={Math.round(hsl.s)} onChange={(event) => choose(hslToHex(hsl.h, Number(event.target.value)))} />
      <label htmlFor="accent-hex">Hex color</label><input id="accent-hex" value={hex} maxLength={7} spellCheck={false} onChange={(event) => { const value = event.target.value; setHex(value); if (validColor(value)) choose(value.toUpperCase()); }} onBlur={() => { if (!validColor(hex)) { setError("Use a six-digit hex color, such as #A7B4F3."); setHex(color); } }} />
      <button className="text-button" type="button" onClick={() => { if (timer.current) clearTimeout(timer.current); pending.current = null; setColor(IRIS); setHex(IRIS); setLastHue(hexToHsl(IRIS).h); setError(""); applyAccent("iris"); update({ accent: "iris", accentColor: undefined }); }}>Reset to Iris</button>
    </div></div>{error && <p className="field-error" role="alert">{error}</p>}</fieldset>;
}
