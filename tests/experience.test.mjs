import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
const temp = mkdtempSync(path.join(tmpdir(), "whereditgo-experience-"));
let spending, batch, backup, setup, finance, language, patterns, accent, analytics, accounts, copy;
try {
  for (const name of ["finance", "log-copy", "analytics", "accent", "expense-language", "patterns", "accounts", "setup-store", "spending", "batch-entry", "backup"]) writeFileSync(path.join(temp, `${name}.js`), ts.transpileModule(readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
  const require = createRequire(import.meta.url);
  copy = require(path.join(temp, "log-copy.js"));
  analytics = require(path.join(temp, "analytics.js"));
  accounts = require(path.join(temp, "accounts.js"));
  language = require(path.join(temp, "expense-language.js"));
  patterns = require(path.join(temp, "patterns.js"));
  accent = require(path.join(temp, "accent.js"));
  finance = require(path.join(temp, "finance.js"));
  spending = require(path.join(temp, "spending.js")); batch = require(path.join(temp, "batch-entry.js")); backup = require(path.join(temp, "backup.js")); setup = require(path.join(temp, "setup-store.js"));
} finally { rmSync(temp, { recursive: true, force: true }); }
const now = new Date(2026, 0, 12, 12);
const item = (id, day, extra = {}) => ({ id, name: "Monster", amount: 95.1, category: "Food & Drinks", date: new Date(2026, 0, day, 12).toISOString(), ...extra });
const filters = { period: "month", category: "All", account: "all", search: "" };
const account = { id: "gcash", name: "GCash", kind: "ewallet" };
const file = (transactions, accounts = [account]) => JSON.stringify({ version: 1, setup: { ...setup.INITIAL_SETUP, completed: true, accounts }, transactions });

test("periods cross years in local calendar dates and exclude future entries", () => {
  assert.deepEqual(spending.periodBounds("last-month", now), { from: "2025-12-01", to: "2025-12-31" });
  assert.deepEqual(spending.filterEntries([item("today", 12), item("future", 13), item("previous", 0)], filters, now).map((x) => x.id), ["today"]);
  assert.equal(spending.filterEntries([item("previous", 0)], { ...filters, period: "last-month" }, now).length, 1);
});
test("period, category, source and search filters intersect", () => {
  const items = [item("match", 2, { accountId: "gcash" }), item("cash", 2, { accountId: "cash" }), item("outside", 0, { accountId: "gcash" })];
  assert.deepEqual(spending.filterEntries(items, { ...filters, account: "gcash", search: "monster", category: "Food & Drinks" }, now).map((x) => x.id), ["match"]);
  assert.equal(spending.filterEntries([item("old", 1, { category: "Legacy" })], { ...filters, category: "Legacy", account: "unassigned" }, now).length, 1);
  assert.equal(spending.filterEntries(items, { ...filters, period: "custom", from: "2026-01-02", to: "2026-01-02" }, now).length, 2);
});
test("breakdowns and grouped days reconcile exactly in cents", () => {
  const items = [item("a", 1), item("b", 1, { amount: 0.2 }), item("c", 2, { amount: 10, category: "Other", accountId: "gcash" })];
  assert.deepEqual(spending.dayGroups(items).map((g) => g.cents), [1000, 9530]);
  const categories = spending.spendingBreakdown(items, "category");
  assert.equal(categories.reduce((sum, row) => sum + row.cents, 0), 10530);
  assert.equal(spending.spendingBreakdown(items, "account")[0].id, "unassigned");
});
test("batch preview preserves explicit names, supports learned amounts and flags unknowns", () => {
  const result = batch.previewBatch("95.10\n30 jeep\n70", "2026-01-10", [item("teacher", 1)]);
  // Use current history for the learner's rolling window.
  const fresh = { ...item("teacher", 1), date: new Date().toISOString() };
  const learned = batch.previewBatch("95.10\n30 jeep\n70", "2026-01-10", [fresh]);
  assert.equal(result.errors.length, 0);
  assert.equal(learned.entries[0].source, "suggested");
  assert.equal(learned.entries[1].name, "Jeep");
  assert.equal(learned.entries[2].source, "amount-only");
  assert.equal(learned.entries.length, 3);
});
test("batch rejects bad dates, missing amounts and excessive lines before saving", () => {
  assert.match(batch.previewBatch("95 monster\nwrong", "2026-01-10", []).errors[0], /Line 2/);
  assert.ok(batch.previewBatch("95 monster", "2099-01-01", []).errors.length);
  assert.ok(batch.previewBatch(new Array(26).fill("10 jeep").join("\n"), "2026-01-10", []).errors.length);
  assert.ok(batch.previewBatch("", "2026-01-10", []).errors.length);
});
test("backup imports merge new IDs, keep local conflicts and preserve extra fields", () => {
  const original = item("same", 1, { name: "Local correction", note: "keep me" });
  const incoming = item("new", 2, { accountId: "gcash", extra: { reference: "local-only" } });
  const plan = backup.prepareImport(file([item("same", 1), incoming]), [original], []);
  assert.equal(plan.conflicts, 1); assert.equal(plan.skipped, 1);
  assert.deepEqual(plan.entries, [incoming]); assert.equal(plan.accounts[0].id, "gcash");
  const repeated = backup.prepareImport(file([item("same", 1), incoming]), [original, incoming], plan.accounts);
  assert.equal(repeated.entries.length, 0); assert.equal(repeated.sourceCount, 0);
  assert.equal(original.name, "Local correction");
});
test("colliding source IDs are remapped without relabeling local history or multiplying on reimport", () => {
  const local = { ...account, name: "Cash", kind: "cash" };
  const incoming = item("new", 1, { accountId: "gcash" });
  const plan = backup.prepareImport(file([incoming]), [], [local], () => "imported-wallet");
  assert.equal(plan.entries[0].accountId, "imported-wallet");
  assert.equal(plan.accounts[0].name, "Cash");
  const repeated = backup.prepareImport(file([incoming]), plan.entries, plan.accounts, () => "do-not-use");
  assert.equal(repeated.sourceCount, 0); assert.equal(repeated.accounts.length, 2);
});
test("malformed and future-version backups fail before changing data", () => {
  for (const raw of ["bad json", "null", "{}", JSON.stringify({ version: 2 }), file([item("dup", 1), item("dup", 2)]), file([item("bad", 1, { amount: -1 })]), "x".repeat(5 * 1024 * 1024 + 1)]) assert.throws(() => backup.prepareImport(raw, [], []));
});
test("CSV preserves quotes, currency precision, local dates and spreadsheet formula safety", () => {
  const csv = backup.entriesCSV([item("csv", 1, { name: '=SUM(1,2)"', accountId: "gcash" })], [account]);
  assert.ok(csv.startsWith("\uFEFF")); assert.ok(csv.includes('"2026-01-01"')); assert.ok(csv.includes('"95.10"')); assert.ok(csv.includes('"GCash"')); assert.ok(csv.includes("'=SUM")); assert.ok(csv.includes('2)""'));
});


test("everyday categories are useful while custom and legacy categories remain selectable", () => {
  assert.equal(finance.categoryFor("groceries"), "Groceries");
  assert.equal(finance.categoryFor("Meralco"), "Bills & Utilities");
  assert.equal(finance.categoryFor("medicine"), "Health");
  assert.equal(finance.categoryFor("rent"), "Home");
  assert.equal(finance.categoryFor("movie"), "Leisure");
  assert.ok(spending.knownCategories([item("pets", 1, { category: "Pets" })]).includes("Pets"));
  assert.equal(spending.spendingBreakdown([item("pets", 1, { category: "Pets" })], "category")[0].id, "Pets");
});


test("short notes understand name-first, currency, relative dates, known sources and Taglish", () => {
  const context = { accounts: [account] };
  for (const text of ["coffee 150", "150 for coffee", "spent PHP 150 on coffee", "nagbayad ako 150 sa coffee"]) assert.deepEqual(language.parseExpenseText(text, now), { amount: 150, name: "Coffee" });
  const result = language.parseExpenseText("paid 150 for coffee yesterday via GCash", now, context);
  assert.equal(result.name, "Coffee"); assert.equal(result.accountId, "gcash");
  assert.equal(finance.localDateInput(new Date(result.date)), "2026-01-11");
  assert.equal(language.parseExpenseText("groceries 1.5k", now).amount, 1500);
  const early = new Date(2026, 0, 12, 8);
  assert.equal(language.parseExpenseText("coffee 150 today", early).date, early.toISOString());
  assert.equal(finance.categoryFor("kape"), "Food & Drinks");
  assert.equal(finance.categoryFor("pamasahe"), "Transport");
  for (const text of ["coffee 150 lunch 180", "salary 30k", "refund 150", "transfer 500", "coffee -150", "coffee 1.999", "coffee $150", "150 tomorrow"]) assert.equal(language.parseExpenseText(text, now), null, text);
});
test("confirmed payment-source habits resolve amount collisions without training on guesses", () => {
  const items = [item("a", 1, { name: "coffee", accountId: "gcash" }), item("b", 2, { name: "coffee", accountId: "gcash" }), item("c", 3, { name: "jeep", accountId: "cash" }), item("d", 4, { name: "jeep", accountId: "cash" })];
  assert.equal(patterns.suggestExpense(95.1, items, now), null);
  assert.equal(patterns.suggestExpense(95.1, items, now, { accountId: "gcash" }).name, "Coffee");
  assert.equal(patterns.suggestExpense(95.1, items, now, { accountId: "cash" }).name, "Jeep");
  assert.equal(patterns.suggestExpense(95.1, items.map((x) => ({ ...x, source: "suggested", needsReview: true })), now, { accountId: "gcash" }), null);
});
test("time-of-day learning needs repeated evidence and is disabled for backdated notes", () => {
  const morning = new Date(2026, 0, 12, 8, 30);
  const items = [0,1,2].flatMap((i) => [item("morning"+i, 1, { name: "coffee", date: new Date(2026,0,11-i,8,30).toISOString() }), item("evening"+i, 1, { name: "dinner", date: new Date(2026,0,11-i,20,30).toISOString() })]);
  assert.equal(patterns.suggestExpense(95.1, items, morning).name, "Coffee");
  assert.equal(patterns.suggestExpense(95.1, items, morning, { allowTime: false }), null);
  assert.equal(patterns.resolveEntry("95.10 yesterday", items, true, morning).source, "amount-only");
});
test("category corrections persist in subsequent named entries and explicit names always win", () => {
  const items = [item("old", 1, { name: "coffee", category: "Food & Drinks" }), item("corrected", 10, { name: "Coffee", category: "Work meals", source: "confirmed" })];
  assert.equal(patterns.resolveEntry("coffee 150", items, true, now).category, "Work meals");
  assert.equal(patterns.resolveEntry("coffee 150", items, false, now).category, "Food & Drinks");
  assert.equal(patterns.resolveEntry("95.1 jeep", items, true, now).name, "Jeep");
  assert.equal(language.capitalizeExpense("  🧾 lunch with JOE "), "🧾 Lunch with JOE");
});
test("custom accents validate, round-trip hue and keep text readable in both themes", () => {
  for (const color of ["#000000", "#FFFFFF", "#777777", "#A7B4F3", "#FF0000", "#00FF00", "#0000FF"]) {
    assert.equal(accent.validColor(color), true);
    const hsl = accent.hexToHsl(color);
    assert.equal(accent.hslToHex(hsl.h, hsl.s, hsl.l), color);
    const tokens = accent.accentTokens(color);
    const lum = (hex) => [1,3,5].map((i)=>parseInt(hex.slice(i,i+2),16)/255).map((v)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    assert.ok(ratio(tokens["--custom-accent-dark"], "#121b22") >= 4.5);
    assert.ok(ratio(tokens["--custom-accent-dark"], "#2b3e4b") >= 4.5);
    assert.ok(ratio(tokens["--custom-accent-light"], "#f8f3e9") >= 4.5);
    assert.ok(ratio(tokens["--custom-accent-light"], "#e9e3d8") >= 4.5);
    assert.ok(ratio(tokens["--custom-ink"], color) >= 4.5);
    assert.equal(JSON.stringify(vm.runInNewContext(`(${accent.accentTokens.toString()})('${color}')`)), JSON.stringify(tokens));
  }
  assert.equal(setup.isSetup({ ...setup.INITIAL_SETUP, accent: "custom", accentColor: "#A7B4F3" }), true);
  assert.equal(setup.isSetup({ ...setup.INITIAL_SETUP, accent: "custom" }), false);
  assert.equal(setup.isSetup({ ...setup.INITIAL_SETUP, accentColor: "red" }), false);
});

test("calendar handles leap years, month boundaries and exact daily cents", () => {
  assert.equal(analytics.calendarMonth("2024-02").days,29);
  assert.equal(analytics.calendarMonth("2025-02").days,28);
  assert.equal(analytics.shiftMonth("2026-01",-1),"2025-12");
  assert.equal(analytics.shiftMonth("2026-12",1),"2027-01");
  const rows=[item("a",1,{amount:0.1}),item("b",1,{amount:0.2}),item("future",31),item("old",0)];
  const visible=analytics.monthEntries(rows,"2026-01","2026-01-12");
  assert.equal(visible.length,2);assert.equal(analytics.calendarTotals(visible).get("2026-01-01"),30);
  assert.equal(analytics.averageDailyCents(visible,"2026-01","2026-01-12"),3);
});
test("wallet snapshots avoid historical double deductions and reflect edits/deletion/source reassignment",()=>{
  const wallet={id:"g",name:"GCash",kind:"ewallet",balanceCents:100000,balanceRecordedCents:9510};
  const prior=item("prior",1,{accountId:"g"}), extra=item("extra",2,{amount:50,accountId:"g"});
  assert.equal(accounts.accountBalanceCents(wallet,[prior]),100000);
  assert.equal(accounts.accountBalanceCents(wallet,[prior,extra]),95000);
  assert.equal(accounts.accountBalanceCents(wallet,[{...prior,amount:100}]),99510);
  assert.equal(accounts.accountBalanceCents(wallet,[]),109510);
  assert.equal(accounts.accountBalanceCents(wallet,[prior,{...extra,accountId:"cash"}]),100000);
  assert.equal(accounts.accountBalanceCents({...wallet,kind:"card"},[prior,extra]),105000);
  assert.equal(accounts.accountBalanceCents({id:"old",name:"Cash",kind:"cash"},[prior]),null);
});
test("optional balance/provider metadata validates without breaking legacy sources or backups",()=>{
  const wallet={id:"g",name:"GCash",kind:"ewallet",provider:"gcash",balanceCents:0,balanceRecordedCents:100};
  assert.equal(accounts.validAccounts([wallet]),true);
  assert.equal(accounts.validAccounts([{...wallet,balanceCents:-10}]),true);
  for(const patch of [{balanceCents:NaN},{balanceCents:Infinity},{balanceCents:1.1},{balanceRecordedCents:-1},{provider:"fake"},{kind:"card",balanceCents:-10}])assert.equal(accounts.validAccounts([{...wallet,...patch}]),false);
  assert.equal(accounts.accountProvider({id:"b",name:"BPI debit",kind:"bank"}),"bpi");
  const base={...setup.INITIAL_SETUP,accounts:[wallet]};
  const restored=backup.prepareImport(JSON.stringify({version:1,setup:base,transactions:[]}),[],[]);
  assert.deepEqual(restored.accounts,[wallet]);
});

test("Log wording chooses a new matched pair without empty names or an immediate repeat",()=>{
  const visited=new Set();
  for(let i=0;i<copy.LOG_COPY.length;i++){
    const index=copy.chooseLogCopy(-1,(i+.1)/copy.LOG_COPY.length);visited.add(index);
    const named=copy.logCopy(index,"  Taro  "),anonymous=copy.logCopy(index,"");
    assert.ok(named.greeting.includes("Taro"));assert.ok(named.title.length>0);assert.ok(!named.greeting.includes("{name}"));
    assert.ok(!anonymous.greeting.includes("{name}"));assert.ok(!anonymous.greeting.includes(", ."));
    for(const random of [0,.15,.5,.99,1])assert.notEqual(copy.chooseLogCopy(index,random),index);
  }
  assert.equal(visited.size,copy.LOG_COPY.length);
});
