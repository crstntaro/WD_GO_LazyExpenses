import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const profile = { version: 1, step: 4, name: "Alex", goal: "understand", completed: true, budgetEnabled: true, budgetInput: "15000", accounts: [{ id: "cash", name: "Cash", kind: "cash" }, { id: "gcash", name: "GCash", kind: "ewallet" }], defaultAccountId: "gcash" };
const date = (offset: number) => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth() + offset, 1, 12).toISOString(); };
const history = () => [
  { id: "current-monster", name: "Monster", amount: 95, category: "Food & Drinks", date: date(0), accountId: "gcash", source: "manual" },
  { id: "current-jeep", name: "Jeep", amount: 30, category: "Transport", date: date(0), accountId: "cash", source: "manual" },
  { id: "previous", name: "Groceries", amount: 900, category: "Shopping", date: date(-1), accountId: "cash", source: "manual" },
];
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on("pageerror", (error) => list.push(error.message)); });
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });
async function seed(page: Page, entries = history()) {
  await page.addInitScript(({ profile, entries }) => {
    if (!localStorage.getItem("whereditgo-setup-v1")) localStorage.setItem("whereditgo-setup-v1", JSON.stringify(profile));
    if (!localStorage.getItem("whereditgo-transactions-v1")) localStorage.setItem("whereditgo-transactions-v1", JSON.stringify(entries));
  }, { profile, entries });
  await page.goto("/"); await expect(page.locator("#entry-title")).toBeVisible();
}
async function records(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem("whereditgo-transactions-v1") ?? "[]")); }
async function capture(page: Page, path: string) { await page.waitForTimeout(400); await page.screenshot({ path, scale: "css" }); }

test("period totals, breakdown drilldowns, grouped days and CSV use the same records", async ({ page }, info) => {
  await seed(page);
  await page.getByRole("tab", { name: "Entries", exact: true }).click();
  await expect(page.locator(".period-summary")).toContainText("₱125.00");
  await expect(page.locator(".day-heading")).toHaveCount(1);
  await expect(page.locator(".day-heading")).toContainText("₱125.00");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("Category", { exact: true }).selectOption("Food & Drinks");
  await expect(page.locator("#panel-entries .transaction-row")).toHaveCount(1);
  await expect(page.locator(".period-summary")).toContainText("₱95.00");
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const download = await pending; const path = info.outputPath("filtered.csv"); await download.saveAs(path);
  const csv = await readFile(path, "utf8"); expect(csv).toContain('"Monster"'); expect(csv).not.toContain('"Jeep"'); expect(csv).not.toContain('"Groceries"');
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("button", { name: "Last month", exact: true }).click();
  await expect(page.locator(".period-summary")).toContainText("₱900.00");
  await capture(page, info.outputPath("entries-month.png"));
  await page.getByRole("button", { name: "Dates", exact: true }).click();
  const day = date(-1).slice(0, 10);
  await page.getByLabel("From", { exact: true }).fill(day); await page.getByLabel("To", { exact: true }).fill(day);
  await expect(page.locator(".period-summary")).toContainText("₱900.00");
});

test("batch catch-up previews before saving, rejects invalid lines, and retains date and source", async ({ page }, info) => {
  await seed(page);
  await page.getByRole("tab", { name: "Catch-Up", exact: true }).click();
  await page.getByText("Log several at once", { exact: false }).click();
  await page.getByLabel("Expenses", { exact: true }).fill("95\n30 jeep\nwrong");
  await page.getByRole("button", { name: "Review expenses", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Line 3" })).toContainText("Line 3"); expect(await records(page)).toHaveLength(3);
  await page.getByLabel("Expenses", { exact: true }).fill("95\n30 jeep\n180 lunch");
  await page.getByLabel("Expense date", { exact: true }).fill(date(-1).slice(0, 10));
  await page.getByLabel("Batch paid from", { exact: true }).selectOption("cash");
  await page.getByRole("button", { name: "Review expenses", exact: true }).click();
  await expect(page.locator(".batch-preview")).toContainText("3 expenses · ₱305.00"); expect(await records(page)).toHaveLength(3);
  await page.getByRole("button", { name: "Add 3 expenses", exact: true }).evaluate((element) => element.scrollIntoView({ block: "center" }));
  await capture(page, info.outputPath("batch-preview.png"));
  await page.getByRole("button", { name: "Add 3 expenses", exact: true }).click();
  const saved = await records(page); expect(saved).toHaveLength(6);
  for (const item of saved.slice(0, 3)) { expect(item.accountId).toBe("cash"); expect(item.date.slice(0, 10)).toBe(date(-1).slice(0, 10)); }
  expect(saved[0]).toMatchObject({ name: "Monster", source: "suggested", needsReview: true });
  await page.getByRole("button", { name: "Later", exact: true }).click();
  await expect(page.getByRole("heading", { name: "We can leave these for later." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "We can leave these for later." })).toBeFocused();
  await page.reload(); expect(await records(page)).toHaveLength(6);
});

test("backup preview merges new records, keeps current corrections and is safe to repeat", async ({ page }, info) => {
  await seed(page);
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Iris", exact: true })).not.toBeVisible();
  await page.locator("#data-title-section > summary").click();
  const incoming = { id: "imported", name: "Lunch", amount: 180, category: "Food & Drinks", date: date(0), accountId: "gcash", note: "preserve extra fields" };
  const raw = JSON.stringify({ version: 1, setup: { ...profile, name: "Different profile" }, transactions: [{ ...history()[0], amount: 999 }, incoming] });
  const upload = page.getByLabel("Import backup", { exact: true });
  await upload.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(raw) });
  await expect(page.getByLabel("Backup preview")).toContainText("1 new entry");
  await expect(page.getByLabel("Backup preview")).toContainText("1 entry differs"); expect(await records(page)).toHaveLength(3);
  await page.getByLabel("Backup preview").scrollIntoViewIfNeeded();
  await capture(page, info.outputPath("import-preview.png"));
  await page.getByRole("button", { name: "Import new data", exact: true }).click();
  expect(await records(page)).toHaveLength(4);
  expect((await records(page)).find((item: { id: string }) => item.id === "current-monster").amount).toBe(95);
  expect((await records(page))[0].note).toBe("preserve extra fields");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("whereditgo-setup-v1")!).name)).toBe("Alex");
  await upload.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(raw) });
  await expect(page.getByLabel("Backup preview")).toContainText("0 new entries");
  await expect(page.getByRole("button", { name: "Import new data", exact: true })).toBeDisabled();
  await upload.setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"version":2}') });
  await expect(page.getByRole("alert").filter({ hasText: "supported" })).toContainText("supported"); expect(await records(page)).toHaveLength(4);
});

test("daily UI fits 320px, stays usable in light mode and preserves visible focus", async ({ page }, info) => {
  await seed(page);
  await page.setViewportSize({ width: 320, height: 720 });
  for (const name of ["Log", "Entries", "Catch-Up", "Settings"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator("#appearance-title-section > summary").focus();
  await page.keyboard.press("Enter");
  await page.getByRole("switch", { name: "Light mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("tab", { name: "Entries", exact: true }).click();
  await page.getByRole("tab", { name: "Entries", exact: true }).focus();
  await page.keyboard.press("Tab");
  // Safari may skip native buttons unless Full Keyboard Access is enabled.
  // Both browsers must enter the chosen panel rather than escape the app.
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest("#panel-entries")))).toBe(true);
  await page.getByRole("button", { name: "This month", exact: true }).focus();
  expect(await page.getByRole("button", { name: "This month", exact: true }).evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await capture(page, info.outputPath("entries-light-320.png"));
  await page.getByRole("link", { name: "Where'd It Go? home" }).click();
  await expect(page.locator("#entry-title")).toBeVisible();
});


test("custom categories are created in place and reusable without changing older entries", async ({ page }) => {
  await seed(page);
  await page.getByRole("tab", { name: "Entries", exact: true }).click();
  await page.getByRole("button", { name: "Edit Monster", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Category", { exact: true }).selectOption("");
  await editor.getByLabel("Category name", { exact: true }).fill("Work meals");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await records(page)).find((item: { id: string }) => item.id === "current-monster").category).toBe("Work meals");
  expect((await records(page)).find((item: { id: string }) => item.id === "current-jeep").category).toBe("Transport");
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByLabel("Category", { exact: true }).selectOption("Work meals");
  await expect(page.locator("#panel-entries .transaction-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit Monster", exact: true }).click();
  await expect(editor.getByLabel("Category", { exact: true })).toHaveValue("Work meals");
});
