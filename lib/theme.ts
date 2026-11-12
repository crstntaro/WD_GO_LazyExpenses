export type Theme = "dark" | "light";
export const THEME_KEY = "whereditgo-theme-v1";
export const THEME_EVENT = "whereditgo-theme-change";

type Reveal = {
  from: Theme;
  to: Theme;
  target: Theme;
  transition: ViewTransition;
  animation?: Animation;
};

let reveal: Reveal | null = null;

export function getTheme(): Theme {
  const root = document.documentElement;
  return (root.dataset.themeTarget ?? root.dataset.theme) === "light" ? "light" : "dark";
}

function settle(current: Reveal) {
  if (reveal !== current) return;
  document.documentElement.dataset.theme = current.target;
  reveal = null;
  current.transition.skipTransition();
}

export function setTheme(next: Theme, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  root.dataset.themeTarget = next;
  window.dispatchEvent(new Event(THEME_EVENT));

  // Storage events, reduced motion, and unsupported browsers swap both colors
  // in one frame, rather than fading through an unreadable middle palette.
  if (!origin || !document.startViewTransition || root.dataset.motion === "reduced" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (reveal) {
      reveal.target = next;
      settle(reveal);
    } else {
      root.dataset.theme = next;
    }
    return;
  }

  if (reveal) {
    reveal.target = next;
    if (reveal.animation) {
      // Preserve currentTime: repeated clicks reverse one animation, never queue
      // another transition or restart the reveal at its beginning.
      reveal.animation.updatePlaybackRate(next === reveal.to ? 1 : -1);
      reveal.animation.play();
    }
    return;
  }

  const from: Theme = root.dataset.theme === "light" ? "light" : "dark";
  if (from === next) return;

  const transition = document.startViewTransition(() => {
    if (reveal?.transition === transition) root.dataset.theme = next;
  });
  const current: Reveal = { from, to: next, target: next, transition };
  reveal = current;

  void transition.ready.then(() => {
    if (reveal !== current) return;
    // A second click during snapshot capture can cancel before animation starts.
    if (current.target === current.from) {
      settle(current);
      return;
    }

    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y),
    );
    const animation = root.animate(
      { clipPath: [
        `circle(0px at ${origin.x}px ${origin.y}px)`,
        `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
      ] },
      {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
        pseudoElement: "::view-transition-new(root)",
      },
    );
    current.animation = animation;
    void animation.finished.then(() => settle(current), () => settle(current));
  }).catch(() => settle(current));
}
