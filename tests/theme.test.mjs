import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

const compiled = mkdtempSync(path.join(tmpdir(), "whereditgo-theme-"));
const filename = path.join(compiled, "theme.cjs");
const require = createRequire(import.meta.url);
writeFileSync(filename, ts.transpileModule(
  readFileSync(new URL("../lib/theme.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText);
after(() => rmSync(compiled, { recursive: true, force: true }));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture(t, { supported = true, reducedMotion = false } = {}) {
  delete require.cache[filename];
  const theme = require(filename);
  const ready = deferred();
  const finished = deferred();
  const calls = { captures: 0, animations: 0, skips: 0, rates: [], plays: 0 };
  const animation = {
    currentTime: 120,
    finished: finished.promise,
    updatePlaybackRate(rate) { calls.rates.push(rate); },
    play() { calls.plays++; },
  };
  const transition = { ready: ready.promise, skipTransition() { calls.skips++; } };
  let update;
  const root = {
    dataset: { theme: "dark" },
    animate(frames, options) {
      calls.animations++;
      assert.equal(options.pseudoElement, "::view-transition-new(root)");
      assert.match(frames.clipPath[0], /circle\(0px/);
      return animation;
    },
  };
  const globals = { document: globalThis.document, window: globalThis.window };
  globalThis.document = {
    documentElement: root,
    ...(supported ? { startViewTransition(callback) {
      calls.captures++;
      update = callback;
      return transition;
    } } : {}),
  };
  globalThis.window = {
    innerWidth: 1200, innerHeight: 800,
    dispatchEvent() {},
    matchMedia: () => ({ matches: reducedMotion }),
  };
  t.after(() => {
    for (const key of ["document", "window"]) {
      if (globals[key] === undefined) delete globalThis[key];
      else globalThis[key] = globals[key];
    }
  });
  return {
    theme, root, calls, animation,
    async capture() { update(); ready.resolve(); await Promise.resolve(); },
    async finish() { finished.resolve(); await Promise.resolve(); },
    async failCapture() { ready.reject(new Error("Snapshot unavailable")); await Promise.resolve(); await Promise.resolve(); },
  };
}

const origin = { x: 1100, y: 50 };

test("rapid toggles reverse one reveal and settle on the latest requested palette", async (t) => {
  const f = fixture(t);
  f.theme.setTheme("light", origin);
  await f.capture();
  assert.equal(f.root.dataset.theme, "light");
  f.theme.setTheme("dark", origin);
  assert.equal(f.theme.getTheme(), "dark");
  // The new snapshot keeps a complete palette while the reveal reverses.
  assert.equal(f.root.dataset.theme, "light");
  f.theme.setTheme("light", origin);
  f.theme.setTheme("dark", origin);
  assert.deepEqual(f.calls.rates, [-1, 1, -1]);
  assert.equal(f.animation.currentTime, 120);
  assert.equal(f.calls.captures, 1);
  assert.equal(f.calls.animations, 1);
  await f.finish();
  assert.equal(f.root.dataset.theme, "dark");
  assert.equal(f.calls.skips, 1);
});

test("a second click during capture cancels without starting a reveal", async (t) => {
  const f = fixture(t);
  f.theme.setTheme("light", origin);
  f.theme.setTheme("dark", origin);
  await f.capture();
  assert.equal(f.root.dataset.theme, "dark");
  assert.equal(f.calls.animations, 0);
  assert.equal(f.calls.skips, 1);
});

test("unsupported browsers and reduced motion swap the entire palette immediately", (t) => {
  for (const options of [{ supported: false }, { reducedMotion: true }]) {
    const f = fixture(t, options);
    f.theme.setTheme("light", origin);
    assert.equal(f.root.dataset.theme, "light");
    assert.equal(f.theme.getTheme(), "light");
    assert.equal(f.calls.captures, 0);
  }
});

test("a cross-tab update overrides an in-progress reveal", async (t) => {
  const f = fixture(t);
  f.theme.setTheme("light", origin);
  await f.capture();
  f.theme.setTheme("dark");
  assert.equal(f.root.dataset.theme, "dark");
  await f.finish();
  assert.equal(f.root.dataset.theme, "dark");
});

test("a failed snapshot falls back to the latest requested theme", async (t) => {
  const f = fixture(t);
  f.theme.setTheme("light", origin);
  await f.failCapture();
  assert.equal(f.root.dataset.theme, "light");
  assert.equal(f.calls.animations, 0);
});
