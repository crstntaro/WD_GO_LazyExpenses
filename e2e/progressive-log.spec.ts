import { test, expect, type Page } from "@playwright/test";
const setup = { version: 1, step: 4, name: "Alex", goal: "understand", completed: true, budgetEnabled: false, budgetInput: "", accounts: [{ id: "cash", name: "Cash", kind: "cash" }, { id: "gcash", name: "GCash", kind: "ewallet" }], defaultAccountId: "cash" };
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = []; errors.set(page, list); page.on("pageerror", (error) => list.push(error.message));
  await page.addInitScript((setup) => {
    if (!localStorage.getItem("whereditgo-setup-v1")) localStorage.setItem("whereditgo-setup-v1", JSON.stringify(setup));
    if (!localStorage.getItem("whereditgo-transactions-v1")) localStorage.setItem("whereditgo-transactions-v1", "[]");
  }, setup);
  await page.goto("/"); await expect(page.locator("#entry-title")).toBeVisible();
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });
async function records(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem("whereditgo-transactions-v1") ?? "[]")); }

test("Iris defaults and the actual color wheel works with pointer, keyboard, hex and reload", async ({ page }, info) => {
  await expect(page.locator("html")).toHaveAttribute("data-accent", "iris");
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await page.locator("#appearance-title-section > summary").click();
  const wheel = page.getByRole("slider", { name: "Accent hue", exact: true });
  const box = (await wheel.boundingBox())!;
  await wheel.click({ position: { x: box.width * .8, y: box.height * .5 } });
  await expect(page.locator("html")).toHaveAttribute("data-accent", "custom");
  const before = await page.getByLabel("Hex color", { exact: true }).inputValue();
  await wheel.focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Hex color", { exact: true })).not.toHaveValue(before);
  await page.getByLabel("Hex color", { exact: true }).fill("#6633CC");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("whereditgo-setup-v1")!).accentColor)).toBe("#6633CC");
  await page.getByRole("switch", { name: "Light mode", exact: true }).click();
  await page.waitForTimeout(550); await page.locator(".accent-picker").evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.screenshot({ path: info.outputPath("color-wheel.png"), scale: "css" });
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-accent", "custom");
  expect(await page.locator("html").evaluate((element) => element.style.getPropertyValue("--custom-action"))).toBe("#6633CC");
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await page.locator("#appearance-title-section > summary").click();
  await expect(page.getByLabel("Hex color", { exact: true })).toHaveValue("#6633CC");
  await page.getByRole("button", { name: "Reset to Iris", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "iris");
});

test("blink frames and a repeated poke change expression without logging an expense", async ({ page }, info) => {
  const stage = page.locator("#panel-log .detective-stage");
  await expect(stage).toHaveAttribute("data-faces-ready", "true");
  const positions = await stage.locator(".mascot-face-sheet").evaluate(async (element) => {
    const animation = element.getAnimations().find((animation) => (animation as CSSAnimation).animationName === "companionFace")!;
    animation.pause(); animation.currentTime = 100;
    await new Promise(requestAnimationFrame); const open = getComputedStyle(element).backgroundPosition;
    animation.currentTime = 2000; await new Promise(requestAnimationFrame);
    return [open, getComputedStyle(element).backgroundPosition];
  });
  expect(positions[0]).not.toBe(positions[1]);
  const poke = page.getByRole("button", { name: "Poke the detective", exact: true });
  await poke.click(); await poke.click(); await expect(stage).toHaveAttribute("data-poked", "true");
  await expect(page.getByRole("status")).toContainText("on the case");
  expect(await records(page)).toHaveLength(0);
  await page.screenshot({ path: info.outputPath("poked.png"), scale: "css" });
  await expect(stage).toHaveAttribute("data-poked", "false");
  await poke.focus(); await page.keyboard.press("Enter"); await expect(stage).toHaveAttribute("data-poked", "true");
  expect(await records(page)).toHaveLength(0);
});

test("a short remembered note saves the right date/source and then teaches amount-only logging", async ({ page }) => {
  await page.getByRole("button", { name: "Use words", exact: true }).click();
  const note = page.getByRole("textbox", { name: "Expense note", exact: true });
  await note.fill("paid 95 for monster yesterday via GCash");
  await expect(page.locator("#entry-helper")).toContainText("Monster");
  await expect(page.locator("#entry-helper")).toContainText("Yesterday");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  let saved = await records(page); expect(saved[0]).toMatchObject({ name: "Monster", amount: 95, accountId: "gcash", source: "manual" });
  const day = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
  expect(saved[0].date.startsWith(day)).toBe(true);
  await page.getByRole("button", { name: "Use amount", exact: true }).click();
  await page.getByRole("textbox", { name: "Amount", exact: true }).fill("95");
  await expect(page.locator("#entry-helper")).toContainText("Maybe Monster?");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  await page.getByRole("button", { name: "No, edit", exact: true }).click();
  await page.getByLabel("What was it for?").fill("lunch");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  saved = await records(page); expect(saved).toHaveLength(2); expect(saved[0].name).toBe("Lunch");
  await page.reload(); expect(await records(page)).toHaveLength(2);
});

test("invalid or ambiguous notes do not save and the amount-only fast path stays compact", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByRole("textbox", { name: "Expense name", exact: false })).not.toBeVisible();
  const save = (await page.getByRole("button", { name: "Save expense", exact: true }).boundingBox())!;
  const dock = (await page.getByRole("tablist").boundingBox())!;
  expect(save.y + save.height).toBeLessThan(dock.y);
  await page.getByRole("button", { name: "Use words", exact: true }).click();
  await page.getByRole("textbox", { name: "Expense note", exact: true }).fill("coffee 150 lunch 180");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "one purchase" })).toBeVisible(); expect(await records(page)).toHaveLength(0);
  await page.getByRole("button", { name: "Use amount", exact: true }).click();
  await page.getByRole("textbox", { name: "Amount", exact: true }).fill("70");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  expect((await records(page))[0]).toMatchObject({ amount: 70, source: "amount-only", needsReview: true });
  await page.getByRole("button", { name: "Dismiss prompt, keep entry saved", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("fast-log-320.png"), scale: "css" });
});
