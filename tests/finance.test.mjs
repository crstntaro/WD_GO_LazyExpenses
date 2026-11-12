import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

// Exercise the real TS modules using the project's existing compiler.
// No test runner dependency or application build output is needed.
const compiled = mkdtempSync(path.join(tmpdir(), "whereditgo-test-"));
let finance;
let createTransactionStore;
try {
  for (const name of ["finance", "transaction-store"]) {
    const source = readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    });
    writeFileSync(path.join(compiled, `${name}.js`), outputText);
  }
  const require = createRequire(import.meta.url);
  finance = require(path.join(compiled, "finance.js"));
  ({ createTransactionStore } = require(path.join(compiled, "transaction-store.js")));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}

const entry = (id, amount = 95) => ({
  id, name: "monster", category: "Food & Drinks", amount,
  date: "2026-11-12T04:00:00.000Z",
});

function fixture(raw = null) {
  let saved = raw;
  let writes = 0;
  const store = createTransactionStore(() => ({
    getItem(key) {
      assert.equal(key, "whereditgo-transactions-v1");
      return saved;
    },
    setItem(key, value) {
      assert.equal(key, "whereditgo-transactions-v1");
      saved = value;
      writes++;
    },
  }));
  return {
    store,
    get saved() { return saved; },
    get writes() { return writes; },
    externalWrite(value) { saved = value; },
  };
}

test("quick entry accepts daily entries and correctly grouped PHP amounts", () => {
  for (const [input, amount, name] of [
    ["95 monster", 95, "monster"], ["150 lunch", 150, "lunch"],
    ["50 jeep", 50, "jeep"], [" ₱ 1,250.50   milk tea ", 1250.5, "milk tea"],
    ["0.10 snack", 0.1, "snack"], ["1234 lunch", 1234, "lunch"],
  ]) {
    assert.deepEqual(finance.parseQuickEntry(input), { amount, name });
  }
});

test("quick entry rejects invalid, ambiguous, nonpositive and excessive amounts", () => {
  for (const input of ["", "monster", "95", "0 lunch", "-95 lunch", "1.999 lunch",
    "1,2 lunch", ",95 lunch", "95, lunch", "1,,000 lunch", "100000000 lunch", "Infinity lunch"]) {
    assert.equal(finance.parseQuickEntry(input), null, input);
  }
});

test("suggestions and PHP formatting retain expected behavior", () => {
  assert.equal(finance.categoryFor("monster"), "Food & Drinks");
  assert.equal(finance.categoryFor("jeep"), "Transport");
  assert.equal(finance.categoryFor("shopee"), "Shopping");
  assert.equal(finance.categoryFor("miscellaneous"), "Other");
  assert.equal(finance.money(1250.5), "₱1,250.50");
});

test("totals use cents and allow spending beyond the demo balance", () => {
  assert.equal(finance.totalExpenseCents([entry("a", 0.1), entry("b", 0.2)]), 30);
  const spent = finance.totalExpenseCents([entry("a", 3000.25)]);
  assert.equal((finance.STARTING_BALANCE * 100 - spent) / 100, -500.25);
});

test("loading preserves existing records, including legacy categories and extra fields, without writing", () => {
  const legacy = { ...entry("old"), category: "Groceries", account: "Cash" };
  const raw = JSON.stringify([legacy]);
  const f = fixture(raw);
  const unsubscribe = f.store.subscribe(() => {});
  assert.deepEqual(f.store.getSnapshot().transactions, [legacy]);
  assert.equal(f.writes, 0);
  assert.equal(f.saved, raw);
  assert.equal(f.store.getServerSnapshot().loaded, false);
  unsubscribe();
});

test("adding, deleting, and undoing persist to the original key", () => {
  const f = fixture(JSON.stringify([entry("old")]));
  f.store.update((items) => [entry("new", 50), ...items]);
  assert.deepEqual(JSON.parse(f.saved).map((t) => t.id), ["new", "old"]);
  f.store.update((items) => items.filter((t) => t.id !== "old"));
  assert.deepEqual(JSON.parse(f.saved).map((t) => t.id), ["new"]);
  f.store.update((items) => [entry("old"), ...items]);
  const reloaded = fixture(f.saved);
  reloaded.store.read();
  assert.equal(reloaded.store.getSnapshot().transactions.length, 2);
});

test("malformed or unrecognized saved data is never overwritten", () => {
  for (const raw of ["not json", "{}", JSON.stringify([{ id: "partial" }])]) {
    const f = fixture(raw);
    f.store.read();
    f.store.update((items) => [entry("session-only"), ...items]);
    assert.equal(f.saved, raw);
    assert.equal(f.writes, 0);
    assert.ok(f.store.getSnapshot().storageWarning);
    assert.equal(f.store.getSnapshot().transactions.length, 1);
  }
});

test("storage failures keep session changes and expose a warning", () => {
  const store = createTransactionStore(() => ({
    getItem: () => JSON.stringify([entry("old")]),
    setItem: () => { throw new Error("Quota exceeded"); },
  }));
  store.update((items) => [entry("new"), ...items]);
  store.read();
  assert.equal(store.getSnapshot().transactions.length, 2);
  assert.match(store.getSnapshot().storageWarning, /couldn't save/);

  const blocked = createTransactionStore(() => { throw new Error("Storage denied"); });
  blocked.read();
  assert.match(blocked.getSnapshot().storageWarning, /couldn't be read/);
});

test("external tab changes are read before editing and subscribers can unsubscribe", () => {
  const f = fixture();
  let notifications = 0;
  const unsubscribe = f.store.subscribe(() => { notifications++; });
  f.externalWrite(JSON.stringify([entry("other-tab")]));
  f.store.update((items) => [entry("this-tab"), ...items]);
  assert.deepEqual(JSON.parse(f.saved).map((t) => t.id), ["this-tab", "other-tab"]);
  unsubscribe();
  const before = notifications;
  f.store.update((items) => items);
  assert.equal(notifications, before);
});
