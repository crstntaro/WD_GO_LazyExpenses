type Clock = {
  now: () => number;
  schedule: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancel: (handle: ReturnType<typeof setTimeout>) => void;
};

// Pauses preserve remaining time; focus, hover and page visibility are separate
// reasons, so leaving one pause state cannot resume another accidentally.
export function createAutoDismiss(ms: number, expire: () => void, clock: Clock = {
  now: () => Date.now(), schedule: (callback, delay) => setTimeout(callback, delay), cancel: (handle) => clearTimeout(handle),
}) {
  let remaining = ms;
  let started = 0;
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const holds = new Set<string>();
  function schedule() {
    if (done || ms === 0 || holds.size || timer !== undefined) return;
    started = clock.now();
    timer = clock.schedule(() => {
      timer = undefined;
      done = true;
      expire();
    }, remaining);
  }
  schedule();
  return {
    get paused() { return holds.size > 0; },
    pause(reason: string) {
      holds.add(reason);
      if (timer !== undefined) {
        clock.cancel(timer);
        timer = undefined;
        remaining = Math.max(0, remaining - (clock.now() - started));
      }
    },
    resume(reason: string) { holds.delete(reason); schedule(); },
    dispose() {
      done = true;
      if (timer !== undefined) clock.cancel(timer);
      timer = undefined;
    },
  };
}
