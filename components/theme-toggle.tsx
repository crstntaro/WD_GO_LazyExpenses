"use client";

import { useSyncExternalStore } from "react";
import { getTheme, setTheme, THEME_KEY, THEME_EVENT } from "@/lib/theme";

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    setTheme(event.newValue === "light" ? "light" : "dark");
  };
  window.addEventListener(THEME_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function ThemeToggle() {
  const light = useSyncExternalStore(
    subscribe,
    () => getTheme() === "light",
    () => false,
  );

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next = getTheme() === "light" ? "dark" : "light";
    const rect = event.currentTarget.getBoundingClientRect();
    setTheme(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // The switch still works for this visit when storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-label="Light mode"
      aria-checked={light}
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      onClick={toggle}
    >
      <span className="theme-track" aria-hidden="true" />
      <span className="theme-thumb" aria-hidden="true" />
      <span className="theme-moon" aria-hidden="true">☾</span>
      <span className="theme-sun" aria-hidden="true">☀</span>
    </button>
  );
}
