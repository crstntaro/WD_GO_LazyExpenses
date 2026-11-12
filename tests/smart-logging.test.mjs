import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

const temporary = mkdtempSync(path.join(tmpdir(), "whereditgo-smart-"));
let patterns, finance, createAutoDismiss, setup;
try {
  for (const name of ["finance", "expense-language", "patterns", "auto-dismiss", "accounts", "setup-store"]) {
    writeFileSync(path.join(temporary, `${name}.js`), ts.transpileModule(
      readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
    ).outputText);
  }
  const require = createRequire(import.meta.url);
  patterns = require(path.join(temporary, "patterns.js"));
  finance = require(path.join(temporary, "finance.js"));
  setup = require(path.join(temporary, "setup-store.js"));
  ({ createAutoDismiss } = require(path.join(temporary, "auto-dismiss.js")));
} finally { rmSync(temporary, { recursive: true, force: true }); }

const now = new Date(2026, 10, 12, 12);
const item = (id, name = "monster", overrides = {}) => ({ id, name, amount: 95, category: "Food & Drinks", date: new Date(now.getTime() - 86400000).toISOString(), ...overrides });

test("a familiar amount suggests the user's own expense after two matching entries", () => {
  const records = [item("a", "Monster"), item("b", " monster ")];
  const guess = patterns.suggestExpense(95, records, now);
  assert.equal(guess.name.trim().toLowerCase(), "monster");
  assert.equal(guess.matches, 2);
  assert.equal(guess.category, "Food & Drinks");
  assert.equal(patterns.resolveEntry("95", records, true, now).source, "suggested");
});

test("one named expense is enough even when other entries at the amount are unlabeled", () => {
  const records = [item("named", "Monster"), item("missing-a", "Unlabeled expense", { source: "amount-only", needsReview: true }), item("missing-b", "Unlabeled expense", { source: "amount-only", needsReview: true })];
  assert.equal(patterns.suggestExpense(95, records, now).name, "Monster");
  assert.equal(patterns.resolveEntry("95", records, true, now).source, "suggested");
});

test("empty history, tied amounts and weak majorities do not invent a purchase", () => {
  for (const records of [[], [item("a"), item("b", "lunch")], [item("a"), item("b"), item("c", "lunch")]]) {
    assert.equal(patterns.suggestExpense(95, records, now), null);
    const result = patterns.resolveEntry("95", records, true, now);
    assert.equal(result.source, "amount-only");
    assert.equal(result.needsReview, true);
  }
  assert.ok(patterns.suggestExpense(95, [item("a"), item("b"), item("c"), item("d", "lunch")], now));
});

test("unanswered suggestions cannot reinforce themselves", () => {
  const guesses = Array.from({ length: 30 }, (_, i) => item(`guess-${i}`, "monster", { source: "suggested", needsReview: true }));
  const records = [...guesses, item("lunch-a", "lunch"), item("lunch-b", "lunch")];
  assert.equal(patterns.suggestExpense(95, records, now).name, "Lunch");
  assert.equal(patterns.suggestExpense(95, guesses, now), null);
});

test("confirmed names teach the model, while old and future records do not", () => {
  const confirmed = [item("a", "jeep", { source: "confirmed", category: "Transport" }), item("b", "jeep", { source: "confirmed", category: "Transport" })];
  assert.equal(patterns.suggestExpense(95, confirmed, now).category, "Transport");
  assert.equal(patterns.suggestExpense(95, [item("old-a", "monster", { date: new Date(now.getTime() - 91 * 86400000).toISOString() }), item("future", "monster", { date: new Date(now.getTime() + 86400000).toISOString() })], now), null);
});

test("explicit names win, disabling learning still accepts amount-only logging", () => {
  const records = [item("a"), item("b")];
  const explicit = patterns.resolveEntry("95 jeep", records, true, now);
  assert.equal(explicit.name, "Jeep");
  assert.equal(explicit.category, "Transport");
  assert.equal(explicit.needsReview, false);
  assert.equal(patterns.resolveEntry("95", records, false, now).source, "amount-only");
  for (const input of ["", "-95", "0", "1,2", "1.999", "Infinity", "coffee"]) assert.equal(patterns.resolveEntry(input, records, true, now), null);
});

test("corrections in the most recent 50 same-amount entries replace stale habits", () => {
  const old = Array.from({ length: 50 }, (_, i) => item(`old-${i}`, "monster", { date: new Date(now.getTime() - 20 * 86400000).toISOString() }));
  const fresh = Array.from({ length: 50 }, (_, i) => item(`new-${i}`, "lunch"));
  assert.equal(patterns.suggestExpense(95, [...old, ...fresh], now).name, "Lunch");
  assert.equal(patterns.usualExpenses([...fresh, ...old], now).length, 1);
});

test("catch-up dates reject future and impossible days and retain local dates", () => {
  for (const date of ["2026-11-13", "2026-02-30", "garbage", "2026-13-01"]) assert.equal(finance.expenseDate(date, now), null);
  assert.equal(finance.localDateInput(new Date(finance.expenseDate("2026-11-01", now))), "2026-11-01");
  assert.equal(finance.needsDetails(item("a", "monster", { source: "suggested" })), true);
  assert.equal(finance.needsDetails(item("a")), false);
});

test("appearance and learning preferences keep old setup compatible and validate values", () => {
  assert.equal(setup.isSetup(setup.INITIAL_SETUP), true);
  assert.equal(setup.isSetup({ ...setup.INITIAL_SETUP, accent: "iris", learningEnabled: false, confirmationSeconds: 0, reduceMotion: true, reduceTransparency: true }), true);
  for (const patch of [{ accent: "blue" }, { learningEnabled: "yes" }, { confirmationSeconds: -1 }, { reduceMotion: "false" }, { reduceTransparency: "false" }]) assert.equal(setup.isSetup({ ...setup.INITIAL_SETUP, ...patch }), false);
});

function fakeClock() {
  let time = 0, id = 0;
  const tasks = new Map();
  return {
    now: () => time,
    schedule(callback, delay) { const key = ++id; tasks.set(key, { callback, at: time + delay }); return key; },
    cancel(key) { tasks.delete(key); },
    advance(ms) {
      const target = time + ms;
      for (;;) {
        const next = [...tasks].filter(([, task]) => task.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        time = next[1].at; tasks.delete(next[0]); next[1].callback();
      }
      time = target;
    },
  };
}

test("suggestion countdown expires once and only after remaining visible time", () => {
  const clock = fakeClock(); let expired = 0;
  const timer = createAutoDismiss(8000, () => expired++, clock);
  clock.advance(3000); timer.pause("hover"); timer.pause("focus"); clock.advance(20000);
  timer.resume("hover"); clock.advance(20000); assert.equal(expired, 0);
  timer.resume("focus"); clock.advance(4999); assert.equal(expired, 0);
  clock.advance(1); assert.equal(expired, 1);
  timer.resume("focus"); clock.advance(8000); assert.equal(expired, 1);
});

test("keep-open prompts and disposed prompts never expire", () => {
  const clock = fakeClock(); let expired = 0;
  createAutoDismiss(0, () => expired++, clock);
  const timer = createAutoDismiss(8000, () => expired++, clock);
  clock.advance(1000); timer.dispose(); clock.advance(100000);
  assert.equal(expired, 0);
});

test("native timer cancellation is called without the clock object as its receiver", () => {
  const original = globalThis.clearTimeout;
  const receivers = [];
  globalThis.clearTimeout = function (handle) {
    receivers.push(this);
    return original(handle);
  };
  try {
    const timer = createAutoDismiss(8000, () => assert.fail("Disposed prompt expired"));
    timer.pause("hover");
    timer.resume("hover");
    timer.dispose();
    assert.equal(receivers.length, 2);
    assert.ok(receivers.every((receiver) => receiver === undefined || receiver === globalThis));
  } finally { globalThis.clearTimeout = original; }
});
