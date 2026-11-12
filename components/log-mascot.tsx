"use client";
import { assetPath } from "@/lib/asset-path";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
export type DetectiveState = "waiting" | "thinking" | "saved";
export function LogMascot({ state = "waiting", attentive = false, arrivalTarget = false }: { state?: DetectiveState; attentive?: boolean; arrivalTarget?: boolean }) {
  const [ready, setReady] = useState(false);
  const [facesReady, setFacesReady] = useState(false);
  const [poked, setPoked] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pokeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reaction = useRef<Animation | null>(null);
  useEffect(() => {
    let disposed = false;
    const visibility = () => { if (ref.current) ref.current.dataset.paused = String(document.hidden); };
    visibility(); document.addEventListener("visibilitychange", visibility);
    for (const [src, done] of [["/brand/detective-inspecting.png", setReady], ["/brand/detective-expressions.png", setFacesReady]] as const) {
      const sheet = new window.Image(); sheet.src = assetPath(src);
      void sheet.decode().then(() => { if (!disposed) done(true); }).catch(() => {});
    }
    return () => { disposed = true; document.removeEventListener("visibilitychange", visibility); if (pokeTimer.current) clearTimeout(pokeTimer.current); reaction.current?.cancel(); };
  }, []);
  function poke() {
    setPoked(true);
    if (pokeTimer.current) clearTimeout(pokeTimer.current);
    reaction.current?.cancel();
    if (ref.current?.animate && document.documentElement.dataset.motion !== "reduced" && !matchMedia("(prefers-reduced-motion: reduce)").matches) reaction.current = ref.current.animate([
      { transform: "scale(1) rotate(0)" }, { transform: "scale(.94, 1.04) rotate(-5deg)", offset: .25 }, { transform: "scale(1.02, .98) rotate(3deg)", offset: .6 }, { transform: "scale(1) rotate(0)" },
    ], { duration: 600, easing: "cubic-bezier(.22,1,.36,1)" });
    pokeTimer.current = setTimeout(() => setPoked(false), 1100);
  }
  return <div ref={ref} className="log-mascot detective-stage" data-state={state} data-attentive={attentive} data-sprites-ready={ready} data-faces-ready={facesReady} data-poked={poked}>
    <Image src={assetPath("/brand/detective-waiting.png")} alt="" width={200} height={200} className="mascot-waiting" data-mascot-target={arrivalTarget ? "" : undefined} unoptimized />
    <span className="mascot-face-sheet" aria-hidden="true" />
    <div className="mascot-inspection" aria-hidden="true"><Image src={assetPath("/brand/paper-detective.png")} alt="" className="mascot-still" width={108} height={144} unoptimized /><span className="log-mascot-sprite" /></div>
    <Image src={assetPath("/brand/detective-celebrating.png")} alt="" width={200} height={212} className="mascot-saved" unoptimized />
    <button className="mascot-poke" type="button" aria-label="Poke the detective" onClick={poke} />
    {poked && <span className="mascot-reaction" role="status">Hey! I’m on the case.</span>}
  </div>;
}
