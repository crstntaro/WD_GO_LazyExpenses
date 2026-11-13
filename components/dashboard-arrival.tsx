"use client";
import { assetPath } from "@/lib/asset-path";

import Image from "next/image";
import { useLayoutEffect, useRef, type ReactNode } from "react";

type Props = { active: boolean; onComplete: () => void; children: ReactNode };

export function DashboardArrival({ active, onComplete, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLImageElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const wasActive = useRef(false);

  useLayoutEffect(() => {
    if (!active) {
      if (wasActive.current) {
        containerRef.current?.querySelector<HTMLElement>("#entry-title")?.focus({ preventScroll: true });
      }
      wasActive.current = false;
      return;
    }
    wasActive.current = true;
    let disposed = false;
    const animations: Animation[] = [];
    let decodeTimer: ReturnType<typeof setTimeout> | undefined;
    const container = containerRef.current;
    const overlay = overlayRef.current;
    const anchor = anchorRef.current;
    const mascot = mascotRef.current;
    const target = container?.querySelector<HTMLImageElement>("[data-mascot-target]");

    const complete = () => {
      if (!disposed) onComplete();
    };

    // A single frame hands off directly for reduced motion or missing APIs.
    if (!container || !overlay || !anchor || !mascot || !target ||
        !mascot.animate || document.documentElement.dataset.motion === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(complete);
      return () => { disposed = true; cancelAnimationFrame(frame); };
    }

    const styles = getComputedStyle(document.documentElement);
    const time = styles.getPropertyValue("--motion-duration").trim();
    const parsed = parseFloat(time) * (time.endsWith("ms") ? 1 : 1000);
    const duration = Number.isFinite(parsed) && parsed > 0 ? parsed : 320;
    const easing = styles.getPropertyValue("--motion-ease").trim() || "ease-out";
    const travelEasing = styles.getPropertyValue("--motion-travel-ease").trim() || "ease-in-out";
    const flightDuration = duration * 6.5 + 3000;
    const holdEnd = 1 - (duration * 3.25 / flightDuration);

    async function arrive() {
      try {
        const ready = await Promise.race([
          mascot!.decode().then(() => true, () => false),
          new Promise<boolean>(resolve => { decodeTimer = setTimeout(() => resolve(false), 2500); }),
        ]);
        clearTimeout(decodeTimer);
        if (disposed) return;
        if (!ready) { complete(); return; }

        const start = mascot!.getBoundingClientRect();
        const destination = target!.getBoundingClientRect();
        if (!start.width || !destination.width) { complete(); return; }

        // Match the actual image inside object-fit: contain, including the
        // companion slot's vertical padding. Measure instead of guessing mobile offsets.
        const ratio = mascot!.naturalWidth / mascot!.naturalHeight;
        const width = Math.min(destination.width, destination.height * ratio);
        const height = width / ratio;
        const x = destination.left + (destination.width - width) / 2 - start.left;
        const y = destination.top + (destination.height - height) / 2 - start.top;

        // Freeze the source position so the mobile keyboard closing doesn't
        // drag the flight's origin around halfway through the animation.
        Object.assign(anchor!.style, {
          left: `${start.left}px`, top: `${start.top}px`, transform: "none",
        });
        const flight = mascot!.animate([
          { transform: "translate(0, 0) scale(0.96)", opacity: 0, offset: 0, easing: "ease-out" },
          { transform: "translate(0, 0) scale(1)", opacity: 1, offset: duration / flightDuration },
          { transform: "translate(0, -3px) scale(1.025) rotate(-2deg)", opacity: 1, offset: 0.23 },
          { transform: "translate(0, 0) scale(1) rotate(1.5deg)", opacity: 1, offset: 0.34 },
          { transform: "translate(0, -2px) scale(1.015) rotate(-1deg)", opacity: 1, offset: 0.43 },
          { transform: "translate(0, 0) scale(1) rotate(1deg)", opacity: 1, offset: 0.53 },
          { transform: "translate(0, -3px) scale(1.02) rotate(-1.5deg)", opacity: 1, offset: 0.63 },
          { transform: "translate(0, 0) scale(1) rotate(0)", opacity: 1, offset: holdEnd, easing: travelEasing },
          { transform: `translate(${x}px, ${y}px) scale(${width / start.width})`, opacity: 1, offset: 1 },
        ], { duration: flightDuration, fill: "both", easing: "linear" });
        animations.push(flight);
        if (captionRef.current) {
          captionRef.current.style.top = `${start.top + start.height + 24}px`;
          animations.push(captionRef.current.animate([
            { opacity: 1, offset: 0 },
            { opacity: 1, offset: duration / flightDuration },
            { opacity: 1, offset: holdEnd - .06 },
            { opacity: 0, offset: Math.min(.95, holdEnd + .12) },
            { opacity: 0, offset: 1 },
          ], { duration: flightDuration, fill: "both" }));
        }
        await flight.finished;
        if (disposed) return;

        // Swap the flying image for the real Log companion at the same position.
        // The header and expense screen appear together.
        container!.dataset.arrivalPhase = "revealing";
        animations.push(overlay!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration * 1.25, easing, fill: "both" }));
        const header = container!.querySelectorAll<HTMLElement>(".logo-copy, .account-avatar");
        const content = container!.querySelectorAll<HTMLElement>(".top-layout, .bottom-layout");
        for (const element of [...header, ...content]) {
          const isContent = element.matches(".top-layout, .bottom-layout");
          animations.push(element.animate([
            { opacity: 0, transform: `translateY(${isContent ? 6 : 0}px)` },
            { opacity: 1, transform: "translateY(0)" },
          ], { duration: duration * 1.25, delay: 0, easing, fill: "both" }));
        }
        await Promise.all(animations.map((animation) => animation.finished));
        overlay!.hidden = true;
        complete();
      } catch {
        // Decode failures, interrupted animations, or browser differences should
        // never prevent access to an already-saved tracker.
        complete();
      }
    }

    void arrive();
    return () => {
      disposed = true;
      clearTimeout(decodeTimer);
      animations.forEach((animation) => animation.cancel());
      delete container.dataset.arrivalPhase;
    };
  }, [active, onComplete]);

  return (
    <div ref={containerRef} className="dashboard-arrival" data-arriving={active || undefined}>
      <div inert={active || undefined} aria-hidden={active || undefined}>{children}</div>
      {active && (
        <div ref={overlayRef} className="mascot-arrival-overlay" role="status" aria-label="All set. Opening your tracker.">
          <div ref={anchorRef} className="arrival-mascot-anchor">
            <Image ref={mascotRef} src={assetPath("/brand/detective-cooking.webp")} alt="" width={200} height={200} loading="eager"
              className="arrival-mascot" unoptimized />
          </div>
          <p ref={captionRef} className="arrival-caption">Putting your trail together…</p>
        </div>
      )}
    </div>
  );
}
