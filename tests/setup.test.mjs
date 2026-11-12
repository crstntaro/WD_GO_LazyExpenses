import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const directory = mkdtempSync(path.join(tmpdir(), "whereditgo-setup-"));
let setupModule;
try {
  writeFileSync(path.join(directory, "finance.js"), ts.transpileModule(readFileSync(new URL("../lib/finance.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
  writeFileSync(path.join(directory, "accounts.js"), ts.transpileModule(
    readFileSync(new URL("../lib/accounts.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
  ).outputText);
  const source = readFileSync(new URL("../lib/setup-store.ts", import.meta.url), "utf8");
  writeFileSync(path.join(directory, "setup.cjs"), ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText);
  setupModule = createRequire(import.meta.url)(path.join(directory, "setup.cjs"));
} finally { rmSync(directory, { recursive: true, force: true }); }
const { createSetupStore, SETUP_KEY, INITIAL_SETUP, budgetCents } = setupModule;

function fixture(raw = null) {
  const entries = "existing expense data";
  const data = new Map([["whereditgo-transactions-v1", entries]]);
  if (raw !== null) data.set(SETUP_KEY, raw);
  let writes = 0;
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem(key, value) { writes++; data.set(key, value); },
  };
  return { data, storage, store: createSetupStore(() => storage), get writes() { return writes; } };
}

test("first load never overwrites local data or seeds sample expenses", () => {
  const f = fixture();
  f.store.read();
  assert.deepEqual(f.store.getSnapshot().setup, INITIAL_SETUP);
  assert.equal(f.writes, 0);
  assert.equal(f.data.get("whereditgo-transactions-v1"), "existing expense data");
  assert.equal(f.store.getServerSnapshot().loaded, false);
});

test("answers and the current step survive reopening before setup is finished", () => {
  const f = fixture();
  f.store.update({ step: 1 });
  for (const name of ["T", "Ta", "Taro"]) f.store.update({ name });
  f.store.update({ step: 2, goal: "catch-up" });
  const reopened = createSetupStore(() => f.storage);
  reopened.read();
  assert.equal(reopened.getSnapshot().setup.name, "Taro");
  assert.equal(reopened.getSnapshot().setup.step, 2);
  assert.equal(reopened.getSnapshot().setup.goal, "catch-up");
  assert.equal(reopened.getSnapshot().setup.completed, false);
});

test("completed setup without a budget remains completed on every new visit", () => {
  const f = fixture();
  f.store.update({ name: "Taro", completed: true, step: 3, budgetEnabled: false });
  for (let visit = 0; visit < 3; visit++) {
    const reopened = createSetupStore(() => f.storage);
    reopened.read();
    assert.equal(reopened.getSnapshot().setup.completed, true);
    assert.equal(reopened.getSnapshot().setup.budgetEnabled, false);
  }
  assert.equal(f.data.get("whereditgo-transactions-v1"), "existing expense data");
});

test("a monthly budget persists in cents and can be edited without touching expenses", () => {
  const f = fixture();
  f.store.update({ budgetEnabled: true, budgetInput: "10,000.50", step: 3, completed: true });
  const reopened = createSetupStore(() => f.storage);
  reopened.read();
  assert.equal(budgetCents(reopened.getSnapshot().setup.budgetInput), 1000050);
  reopened.update({ completed: false, step: 1 });
  reopened.update({ budgetEnabled: false, completed: true });
  assert.equal(reopened.getSnapshot().setup.budgetEnabled, false);
  assert.equal(f.data.get("whereditgo-transactions-v1"), "existing expense data");
});

test("invalid budget inputs cannot complete setup", () => {
  for (const input of ["", "0", "-50", "1,2", "1.999", "NaN", "Infinity", "100000000"]) {
    assert.equal(budgetCents(input), null, input);
    const f = fixture();
    f.store.update({ budgetEnabled: true, budgetInput: input });
    f.store.update({ completed: true });
    assert.equal(f.store.getSnapshot().setup.completed, false);
  }
});

test("corrupt or future-version setup stays untouched", () => {
  for (const raw of ["bad json", "null", JSON.stringify({ ...INITIAL_SETUP, version: 2 })]) {
    const f = fixture(raw);
    f.store.read();
    f.store.update({ name: "Session only", step: 1 });
    assert.equal(f.data.get(SETUP_KEY), raw);
    assert.equal(f.writes, 0);
    assert.ok(f.store.getSnapshot().warning);
  }
});

test("save failures warn honestly and keep session progress", () => {
  const store = createSetupStore(() => ({
    getItem: () => null,
    setItem() { throw new Error("Storage unavailable"); },
  }));
  store.update({ name: "Taro", step: 1 });
  store.update({ step: 2 });
  assert.equal(store.getSnapshot().setup.name, "Taro");
  assert.equal(store.getSnapshot().setup.step, 2);
  assert.match(store.getSnapshot().warning, /only last for this visit/);
});

test("different browser storage never shares setup", () => {
  const a = fixture();
  const b = fixture();
  a.store.update({ name: "Taro", completed: true });
  b.store.read();
  assert.equal(b.store.getSnapshot().setup.name, "");
  assert.equal(b.store.getSnapshot().setup.completed, false);
});


test("payment sources and defaults persist without assigning historical expenses", () => {
  const f = fixture();
  const accounts = [{ id: "cash", name: "Cash", kind: "cash" }, { id: "gcash", name: "GCash", kind: "ewallet" }];
  f.store.update({ step: 4, accounts, defaultAccountId: "gcash" });
  const reopened = createSetupStore(() => f.storage);
  reopened.read();
  assert.deepEqual(reopened.getSnapshot().setup.accounts, accounts);
  assert.equal(reopened.getSnapshot().setup.defaultAccountId, "gcash");
  assert.equal(reopened.getSnapshot().setup.step, 4);
  reopened.update({ accounts: accounts.map((a) => ({ ...a, archived: a.id === "gcash" })), defaultAccountId: "" });
  assert.equal(reopened.getSnapshot().setup.accounts[1].archived, true);
  assert.equal(f.data.get("whereditgo-transactions-v1"), "existing expense data");
});

test("invalid accounts and dangling or archived defaults cannot overwrite valid setup", () => {
  const f = fixture();
  const account = { id: "cash", name: "Cash", kind: "cash" };
  f.store.update({ accounts: [account], defaultAccountId: "cash" });
  const saved = f.data.get(SETUP_KEY);
  for (const patch of [
    { accounts: [account, account] }, { accounts: [{ ...account, name: " " }] },
    { accounts: [{ ...account, kind: "unknown" }] }, { accounts: new Array(51).fill(account) },
    { defaultAccountId: "missing" }, { accounts: [{ ...account, archived: true }] },
  ]) {
    f.store.update(patch);
    assert.equal(f.data.get(SETUP_KEY), saved);
  }
});
