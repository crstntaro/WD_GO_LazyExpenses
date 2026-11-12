"use client";

import { useRef, type CSSProperties, type KeyboardEvent } from "react";

export const TABS = ["log", "entries", "analytics", "catch-up", "settings"] as const;
export type Tab = typeof TABS[number];
const labels: Record<Tab, string> = { log: "Log", entries: "Entries", analytics: "Analytics", "catch-up": "Catch-Up", settings: "Settings" };

function TabIcon({ tab }: { tab: Tab }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {tab === "log" && <><path d="M6 3h10l3 3v15l-3-2-3 2-3-2-4 2V3Z" /><path d="M10 10h5M12.5 7.5v5" /></>}
    {tab === "entries" && <><path d="M8 5h12M8 12h12M8 19h12" /><path d="M3 5h.1M3 12h.1M3 19h.1" /></>}
    {tab === "catch-up" && <><circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6M8 10l1.5 1.5L12 8" /></>}
    {tab === "analytics" && <><path d="M4 20V10m8 10V4m8 16v-7" /></>}
    {tab === "settings" && <><path d="M4 7h7m4 0h5M4 17h3m4 0h9" /><circle cx="13" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>}
  </svg>;
}

export function BottomTabs({ active, onChange, reviewCount }: { active: Tab; onChange: (tab: Tab) => void; reviewCount: number }) {
  const ref = useRef<HTMLElement>(null);
  function keydown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : event.key === "ArrowLeft" ? (index + TABS.length - 1) % TABS.length : event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(TABS[next]);
    ref.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }
  return <nav ref={ref} className="bottom-tabs bottom-layout" role="tablist" aria-label="Your tracker" style={{ "--active-index": TABS.indexOf(active) } as CSSProperties}>
    <span className="nav-selection" aria-hidden="true" />
    {TABS.map((tab, index) => <button key={tab} id={`tab-${tab}`} role="tab" type="button"
      aria-selected={active === tab} aria-controls={`panel-${tab}`} tabIndex={active === tab ? 0 : -1}
      aria-label={tab === "catch-up" && reviewCount ? `Catch-Up, ${reviewCount} ${reviewCount === 1 ? "entry" : "entries"} to review` : labels[tab]}
      onKeyDown={(event) => keydown(event, index)} onClick={() => onChange(tab)}>
      <span className="tab-symbol"><TabIcon tab={tab} />{tab === "catch-up" && reviewCount > 0 && <span className="review-count">{reviewCount}</span>}</span>
      <span>{labels[tab]}</span>
    </button>)}
  </nav>;
}
