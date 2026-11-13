import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const setup = { version: 1, step: 3, name: "Test Taro", goal: "understand", budgetEnabled: false, budgetInput: "", completed: true };
const history = () => [1, 2].map((id) => ({ id: `seed-${id}`, name: "monster", amount: 95, category: "Food & Drinks", date: new Date(Date.now() - id * 3600000).toISOString() }));
const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? []).toEqual([]);
});

async function seed(page: Page, records = history(), preferences = {}) {
  await page.addInitScript(({ profile, transactions }) => {
    if (!localStorage.getItem("whereditgo-setup-v1")) localStorage.setItem("whereditgo-setup-v1", JSON.stringify(profile));
    if (!localStorage.getItem("whereditgo-transactions-v1")) localStorage.setItem("whereditgo-transactions-v1", JSON.stringify(transactions));
  }, { profile: { ...setup, ...preferences }, transactions: records });
  await page.goto("/");
  await expect(page.locator("#entry-title")).toBeVisible();
}

async function records(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("whereditgo-transactions-v1") ?? "[]"));
}

async function capture(page: Page, path: string) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  // Capture the settled screen, while leaving the eight-second prompt timer alone.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((animation) => {
    const timing = animation.effect?.getTiming();
    return typeof timing?.duration === "number" && timing.duration <= 1000 && timing.iterations !== Infinity;
  }).map((animation) => animation.finished.catch(() => {}))));
  await page.screenshot({ path, scale: "css" });
}

async function expandSettings(page: Page, id: string) {
  const section = page.locator(`#${id}-title-section`);
  if (await section.getAttribute("open") === null) await section.locator(":scope > summary").click();
}

async function log(page: Page, input: string) {
  const field = page.getByRole("textbox", { name: "Amount", exact: true });
  const match = input.match(/^(\S+)(?:\s+(.+))?$/)!;
  await field.fill(match[1]);
  if (match[2]) {
    if (await page.locator("#panel-log .optional-entry-details").getAttribute("open") === null) await page.locator("#panel-log .optional-entry-details > summary").click();
    await page.getByRole("textbox", { name: "Expense name", exact: false }).fill(match[2]);
  }
  await field.press("Enter");
}

test("welcome, setup, mascot handoff and return visits preserve local data", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
  await expect(page.locator("header")).toHaveCount(0);
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Your name").fill("Test Taro");
  await page.getByRole("button", { name: "That’s me" }).click();
  await page.getByText("Get back into tracking", { exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText("I have a number in mind", { exact: true }).click();
  await page.getByLabel("Monthly budget", { exact: false }).fill("300.50");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How do you pay?" })).toBeVisible();
  await page.getByRole("button", { name: "+ Cash", exact: true }).click();
  await page.getByRole("button", { name: "+ GCash", exact: true }).click();
  await page.getByLabel("Default for new expenses").selectOption({ label: "GCash" });
  await capture(page, info.outputPath("setup-payment-sources.png"));
  await page.getByRole("button", { name: "Start tracking" }).click();
  await expect(page.locator(".arrival-mascot")).toHaveAttribute("src", "/brand/detective-cooking.webp");
  await expect(page.locator(".arrival-caption")).toHaveText("Putting your trail together…");
  await page.locator(".arrival-mascot").evaluate(async (element: HTMLImageElement) => {
    await element.decode();
    for (const animation of element.closest(".mascot-arrival-overlay")!.getAnimations({ subtree: true })) {
      animation.pause(); animation.currentTime = Number(animation.effect!.getTiming().duration) * .34;
    }
  });
  await page.screenshot({ path: info.outputPath("setup-cooking-pose.png"), scale: "css" });
  await page.locator(".mascot-arrival-overlay").evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.play()));
  await expect(page.locator("#entry-title")).toBeVisible();
  await expect(page.locator(".mascot-arrival-overlay")).toHaveCount(0);
  await log(page, "50 jeep");
  await expect.poll(async () => (await records(page)).length).toBe(1);
  await page.reload();
  await expect(page.locator("#entry-title")).toBeVisible();
  expect((await records(page))[0].name).toBe("Jeep");
  await expect(page.getByLabel("Paid from", { exact: true })).toHaveValue((await records(page))[0].accountId);
  await expect(page.locator(".spending-slip")).toContainText("₱250.50");
  const image = await page.locator("#panel-log [data-mascot-target]").boundingBox();
  expect(image!.width).toBeLessThanOrEqual(220);
  await capture(page, info.outputPath("return-visit.png"));
});

test("95 learns a local pattern and No edits the original record without duplication", async ({ page }, info) => {
  await seed(page);
  await log(page, "95");
  const prompt = page.getByRole("complementary", { name: "Review your saved entry" });
  await expect(prompt).toContainText("₱95.00 for Monster?");
  const before = await records(page);
  expect(before).toHaveLength(3);
  expect(before[0].source).toBe("suggested");
  await capture(page, info.outputPath("amount-suggestion.png"));
  await page.getByRole("button", { name: "No, edit" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("What was it for?").fill("lunch");
  await page.getByLabel("Amount · PHP").fill("99.75");
  await page.getByRole("button", { name: "Save changes" }).click();
  const after = await records(page);
  expect(after).toHaveLength(3);
  expect(after[0]).toMatchObject({ id: before[0].id, name: "Lunch", amount: 99.75, source: "manual", needsReview: false });
  await page.reload();
  await expect(page.locator("#entry-title")).toBeVisible();
  expect((await records(page))[0].name).toBe("Lunch");
});

test("one Monster teaches 95 and existing unnamed entries stay unchanged until confirmed", async ({ page }) => {
  const named = history()[0];
  const unnamed = ["old-a", "old-b"].map((id) => ({ ...named, id, name: "Unlabeled expense", category: "Other", source: "amount-only", needsReview: true }));
  await seed(page, [named, ...unnamed]);
  await expect(page.locator("#entry-helper")).toHaveCount(0);
  await log(page, "95");
  await expect(page.getByRole("complementary", { name: "Review your saved entry" })).toContainText("₱95.00 for Monster?");
  expect((await records(page)).filter((item: { name: string }) => item.name === "Unlabeled expense")).toHaveLength(2);
  await page.getByRole("button", { name: "Yes, correct" }).click();
  await page.getByRole("tab", { name: /^Catch-Up/ }).click();
  await page.getByRole("button", { name: "Use Monster", exact: true }).first().click();
  const saved = await records(page);
  expect(saved).toHaveLength(4);
  expect(saved.filter((item: { id: string; source: string }) => item.id.startsWith("old-") && item.source === "confirmed")).toHaveLength(1);
});

test("mascot inspects in four directions and respects both reduced-motion controls", async ({ page }, info) => {
  await seed(page);
  await page.getByRole("textbox", { name: "Amount", exact: true }).fill("95");
  await expect(page.locator("#panel-log .log-mascot")).toHaveAttribute("data-sprites-ready", "true");
  const sprite = page.locator("#panel-log .log-mascot-sprite");
  const positions: string[] = [];
  for (const [pose, time] of [["left", 2850], ["right", 4200], ["up", 5000], ["down", 6000]] as const) {
    positions.push(await sprite.evaluate(async (element, currentTime) => {
      const animation = element.getAnimations()[0];
      animation.pause(); animation.currentTime = currentTime;
      await new Promise(requestAnimationFrame);
      return getComputedStyle(element).backgroundPosition;
    }, time));
    await capture(page, info.outputPath(`mascot-${pose}.png`));
  }
  expect(new Set(positions).size).toBe(4);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(sprite).toHaveCSS("animation-name", "none");
  await expect(page.locator("#panel-log .mascot-still")).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await expandSettings(page, "appearance");
  await page.getByRole("switch", { name: /Reduce motion/ }).check();
  await page.getByRole("tab", { name: "Log", exact: true }).click();
  await expect(sprite).toHaveCSS("animation-name", "none");
  await expect(page.locator("#panel-log .mascot-still")).toHaveCSS("opacity", "1");
});

test("explicit confirmation teaches a suggestion without adding another expense", async ({ page }) => {
  await seed(page);
  await log(page, "95");
  await page.getByRole("button", { name: "Yes, correct" }).click();
  const result = await records(page);
  expect(result).toHaveLength(3);
  expect(result[0]).toMatchObject({ source: "confirmed", needsReview: false });
  await page.getByRole("tab", { name: "Catch-Up", exact: true }).click();
  await expect(page.getByText("Nothing to organize.")).toBeVisible();
});

test("an unanswered prompt vanishes and leaves the saved guess available in Catch-Up", async ({ page }) => {
  await seed(page);
  await page.clock.install();
  await log(page, "95");
  await expect(page.getByRole("button", { name: "No, edit" })).toBeVisible();
  await page.clock.runFor(8500);
  await expect(page.locator(".suggestion-prompt")).toHaveCount(0);
  const result = await records(page);
  expect(result).toHaveLength(3);
  expect(result[0]).toMatchObject({ name: "Monster", source: "suggested", needsReview: true });
  await page.getByRole("tab", { name: /Catch-Up/ }).click();
  await expect(page.getByText("1 expense to organize.")).toBeVisible();
});

test("the prompt pauses while a keyboard user is reviewing it", async ({ page }) => {
  await seed(page);
  await page.clock.install();
  await log(page, "95");
  await page.getByRole("button", { name: "Yes, correct" }).focus();
  await page.clock.runFor(16000);
  await expect(page.locator(".suggestion-prompt")).toBeVisible();
  await page.getByRole("textbox", { name: "Amount", exact: true }).focus();
  await page.clock.runFor(8500);
  await expect(page.locator(".suggestion-prompt")).toHaveCount(0);
});

test("unknown amounts, remembered purchases, editing, filtering, deletion and undo work together", async ({ page }, info) => {
  await seed(page, []);
  await log(page, "50");
  await expect(page.getByRole("button", { name: "Add a name" })).toBeVisible();
  await page.getByRole("button", { name: "Add a name" }).click();
  await page.getByLabel("What was it for?").fill("jeep");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("tab", { name: "Catch-Up", exact: true }).click();
  await page.getByRole("button", { name: "Add a missed expense" }).click();
  await page.getByLabel("What was it for?").fill("lunch");
  await page.getByLabel("Amount · PHP").fill("150");
  const yesterday = new Date(Date.now() - 86400000);
  const date = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  expect(await records(page)).toHaveLength(2);
  await page.getByRole("tab", { name: "Entries", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search entries" }).fill("jeep");
  await expect(page.locator("#panel-entries .transaction-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit Jeep", exact: true }).click();
  await page.getByRole("button", { name: "Remove Jeep", exact: true }).click();
  expect(await records(page)).toHaveLength(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await records(page)).toHaveLength(2);
  await page.getByRole("searchbox", { name: "Search entries" }).fill("");
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByLabel("Category", { exact: true }).selectOption("Food & Drinks");
  await expect(page.locator("#panel-entries .transaction-row")).toHaveCount(1);
  await expect(page.locator("#panel-entries")).toContainText("Lunch");
  await capture(page, info.outputPath("entries-filtered.png"));
});

test("appearance, rapid theme reversals, learning preferences and backup persist", async ({ page }, info) => {
  await seed(page);
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await expandSettings(page, "appearance");
  await page.getByRole("button", { name: "Reset to Iris", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "iris");
  const theme = page.getByRole("switch", { name: "Light mode", exact: true });
  await theme.click(); await theme.click(); await theme.click();
  await page.waitForTimeout(600);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expandSettings(page, "appearance");
  await page.getByRole("switch", { name: /Reduce motion/ }).check();
  await expandSettings(page, "smart");
  await page.getByRole("switch", { name: /Learn my usual expenses/ }).uncheck();
  await page.getByLabel("Suggestion prompt").selectOption("0");
  await expandSettings(page, "profile");
  await page.getByRole("button", { name: "Edit profile & budget", exact: true }).click();
  await page.getByLabel("Name or nickname", { exact: true }).fill("Test Maya");
  await page.getByLabel("Use a monthly budget").check();
  await page.getByLabel("Monthly budget · PHP").fill("100");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.getByRole("button", { name: "Close account", exact: true }).click();await expect(page.locator(".account-dialog")).toHaveCount(0);
  await expandSettings(page, "data");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const file = await download;
  const location = info.outputPath("backup.json");
  await file.saveAs(location);
  const data = JSON.parse(await readFile(location, "utf8"));
  expect(data.transactions).toHaveLength(2);
  expect(data.setup).toMatchObject({ name: "Test Maya", budgetEnabled: true, budgetInput: "100", accent: "iris", reduceMotion: true, learningEnabled: false, confirmationSeconds: 0 });
  await capture(page, info.outputPath("settings-light.png"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "iris");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await expect(page.locator(".spending-slip")).toContainText("₱90.00");
  await log(page, "95");
  expect((await records(page))[0].source).toBe("amount-only");
  await page.clock.install(); await page.clock.runFor(30000);
  await expect(page.locator(".suggestion-prompt")).toBeVisible();
});

test("unreadable saved records are protected when adding a session-only expense", async ({ page }) => {
  await page.addInitScript((profile) => {
    localStorage.setItem("whereditgo-setup-v1", JSON.stringify(profile));
    localStorage.setItem("whereditgo-transactions-v1", "unrecognized original data");
  }, setup);
  await page.goto("/");
  await expect(page.getByRole("alert").filter({ hasText: "couldn't be read" })).toBeVisible();
  await log(page, "50 jeep");
  await expect(page.locator("#panel-log .transaction-list")).toContainText("Jeep");
  expect(await page.evaluate(() => localStorage.getItem("whereditgo-transactions-v1"))).toBe("unrecognized original data");
});

test("all five tabs fit a 320px phone, with keyboard navigation and no horizontal overflow", async ({ page }, info) => {
  await seed(page);
  await page.setViewportSize({ width: 320, height: 700 });
  for (const name of ["Log", "Entries", "Analytics", "Catch-Up", "Settings"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole("tab", { name: "Log", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Settings", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Catch-Up", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Log", exact: true }).click();
  await capture(page, info.outputPath("log-320px.png"));
});

test("production shell reopens offline and still records an expense", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, serviceWorkers: "allow" });
  const page = await context.newPage();
  try {
    await seed(page);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#entry-title")).toBeVisible();
    await log(page, "50 jeep");
    expect(await records(page)).toHaveLength(3);
    expect((await records(page))[0].name).toBe("Jeep");
  } finally { await context.close(); }
});

test("payment sources persist, filter spending, edit old entries, archive and restore without losing history", async ({ page }, info) => {
  const accounts = [{ id: "wallet", name: "GCash", kind: "ewallet" }, { id: "cash", name: "Cash", kind: "cash" }];
  await seed(page, history(), { accounts, defaultAccountId: "wallet" });
  await expect(page.getByLabel("Paid from", { exact: true })).toHaveValue("wallet");
  await log(page, "95 monster");
  expect((await records(page))[0].accountId).toBe("wallet");
  await page.getByLabel("Paid from", { exact: true }).selectOption("cash");
  await log(page, "50 jeep");
  expect((await records(page))[0].accountId).toBe("cash");
  await page.getByRole("tab", { name: "Entries", exact: true }).click();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByLabel("Payment source", { exact: true }).selectOption("wallet");
  await expect(page.locator("#panel-entries .transaction-row")).toHaveCount(1);
  await expect(page.locator("#panel-entries .period-summary")).toContainText("₱95.00");
  await page.getByLabel("Payment source", { exact: true }).selectOption("unassigned");
  await expect(page.locator("#panel-entries .transaction-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Edit Monster", exact: true }).first().click();
  await expect(page.getByRole("dialog").getByLabel("Paid from", { exact: true })).toHaveValue("");
  await page.getByRole("dialog").getByLabel("Paid from", { exact: true }).selectOption("wallet");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("#panel-entries .transaction-row")).toHaveCount(1);
  expect(await records(page)).toHaveLength(4);
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await expandSettings(page, "accounts");
  await page.getByText("Add another payment source", { exact: true }).click();
  await page.getByLabel("Account or card nickname").fill("BPI debit");
  await page.getByLabel("Type", { exact: true }).selectOption("card");
  await page.getByRole("button", { name: "Add payment source", exact: true }).click();
  await expect(page.locator(".account-list")).toContainText("BPI debit");
  await page.getByRole("button", { name: "Archive GCash", exact: true }).click();
  await expect(page.getByLabel("Default for new expenses")).toHaveValue("");
  await capture(page, info.outputPath("payment-sources.png"));
  await page.reload();
  await expect(page.getByLabel("Paid from", { exact: true })).toHaveValue("");
  await expect(page.locator("#log-account option")).not.toContainText(["GCash"]);
  await page.getByRole("tab", { name: "Entries", exact: true }).click();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByLabel("Payment source", { exact: true }).selectOption("wallet");
  await expect(page.locator("#panel-entries .transaction-row")).toHaveCount(2);
  await expect(page.locator("#panel-entries .transaction-row").first()).toContainText("GCash (archived)");
  await capture(page, info.outputPath("payment-filter.png"));
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await expandSettings(page, "accounts");
  await page.getByRole("button", { name: "Restore GCash", exact: true }).click();
  await page.getByLabel("Default for new expenses").selectOption("wallet");
  await page.getByRole("tab", { name: "Catch-Up", exact: true }).click();
  await page.getByRole("button", { name: "Add a missed expense" }).click();
  await expect(page.getByRole("dialog").getByLabel("Paid from", { exact: true })).toHaveValue("wallet");
  await page.getByLabel("What was it for?").fill("coffee");
  await page.getByLabel("Amount · PHP").fill("100");
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  expect((await records(page))[0]).toMatchObject({ name: "Coffee", accountId: "wallet" });
});

test("a stalled setup illustration cannot block an already-saved tracker", async ({ page }) => {
  await page.route("**/brand/detective-cooking.webp", () => {});
  await page.addInitScript(() => localStorage.setItem("whereditgo-setup-v1", JSON.stringify({version:1,step:4,name:"Alex",goal:"understand",completed:false,budgetEnabled:false,budgetInput:"",accounts:[{id:"cash",name:"Cash",kind:"cash"}],defaultAccountId:"cash"})));
  await page.goto("/");
  await page.getByRole("button", {name:"Start tracking",exact:true}).click();
  await expect(page.locator(".arrival-caption")).toBeVisible();
  await expect(page.locator(".mascot-arrival-overlay")).toHaveCount(0, {timeout:5000});
  await expect(page.locator("#entry-title")).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("whereditgo-setup-v1")!).completed)).toBe(true);
  await log(page,"30 jeep");
  expect((await records(page))[0]).toMatchObject({name:"Jeep",amount:30});
});
