import { test, expect } from "@playwright/test";
async function settled(page: import("@playwright/test").Page) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((animation) => {
    const timing = animation.effect?.getTiming();
    return typeof timing?.duration === "number" && timing.duration <= 1000 && timing.iterations !== Infinity;
  }).map((animation) => animation.finished.catch(() => {}))));
  await page.evaluate(() => new Promise(requestAnimationFrame));
}
const profile = { version: 1, step: 4, completed: true, name: "Alex", goal: "understand", budgetEnabled: false, budgetInput: "", accounts: [{ id: "gcash", name: "GCash", kind: "ewallet" }], defaultAccountId: "gcash" };
test.beforeEach(async ({ page }) => {
  await page.addInitScript((profile) => {
    if (!localStorage.getItem("whereditgo-setup-v1")) localStorage.setItem("whereditgo-setup-v1", JSON.stringify(profile));
    if (!localStorage.getItem("whereditgo-transactions-v1")) localStorage.setItem("whereditgo-transactions-v1", JSON.stringify([{ id: "teacher", name: "Monster", amount: 95, category: "Food & Drinks", date: new Date(Date.now() - 3600000).toISOString(), source: "manual" }]));
  }, profile);
  await page.goto("/"); await expect(page.locator("#entry-title")).toBeVisible();
});

test("peso-first input and the detective respond to entry, recognition and saving", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const stage = page.locator("#panel-log .detective-stage");
  await expect(page.locator("header .header-mascot")).toHaveCount(0);
  await expect(page.locator(".peso-prefix")).toHaveText("₱");
  const amount = page.getByRole("textbox", { name: "Amount", exact: true });
  await expect(amount).toHaveAttribute("placeholder", "0.00");
  await expect(amount).toHaveAttribute("inputmode", "decimal");
  await expect(stage).toHaveAttribute("data-state", "waiting");
  const bounds = await stage.boundingBox(); expect(bounds!.width).toBeGreaterThanOrEqual(140);
  await amount.focus(); await expect(stage).toHaveAttribute("data-attentive", "true");
  await amount.fill("95"); await expect(stage).toHaveAttribute("data-state", "thinking");
  await expect(page.locator("#entry-helper")).toContainText("Monster");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  await expect(stage).toHaveAttribute("data-state", "saved");
  await expect(page.getByRole("complementary", { name: "Review your saved entry" })).toContainText("₱95.00 for Monster?");
  await page.getByRole("button", { name: "Yes, correct", exact: true }).click();
  await expect(stage).toHaveAttribute("data-state", "waiting");
  await amount.fill("150.50"); await page.locator("#panel-log .optional-entry-details > summary").click(); await page.getByRole("textbox", { name: "Expense name", exact: false }).fill("Coffee");
  await amount.press("Enter");
  const entries = await page.evaluate(() => JSON.parse(localStorage.getItem("whereditgo-transactions-v1")!));
  expect(entries[0]).toMatchObject({ name: "Coffee", amount: 150.5, accountId: "gcash", source: "manual" });
  expect(entries).toHaveLength(3);
  await settled(page);
  await page.screenshot({ path: info.outputPath("saved-pose.png"), scale: "css" });
  expect(errors).toEqual([]);
});

test("glass dock reverses smoothly under rapid navigation and has a persistent solid fallback", async ({ page }, info) => {
  const nav = page.getByRole("tablist", { name: "Your tracker" });
  await expect(nav.locator(".nav-selection")).toBeVisible();
  for (const name of ["Entries", "Settings", "Log", "Catch-Up", "Entries", "Log", "Settings"]) await page.getByRole("tab", { name, exact: true }).click();
  await page.waitForTimeout(550);
  const pill = await nav.locator(".nav-selection").boundingBox();
  const selected = await page.getByRole("tab", { name: "Settings", exact: true }).boundingBox();
  expect(Math.abs((pill!.x + pill!.width / 2) - (selected!.x + selected!.width / 2))).toBeLessThan(3);
  await page.locator("#appearance-title-section > summary").click();
  await page.getByRole("switch", { name: /Solid navigation/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-transparency", "solid");
  await expect(nav).toHaveCSS("backdrop-filter", "none");
  await page.getByRole("switch", { name: /Reduce motion/ }).check();
  const duration = await nav.locator(".nav-selection").evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration));
  expect(duration).toBeLessThan(0.01);
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-transparency", "solid");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page.getByRole("tab", { name: "Catch-Up", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Catch-Up", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "All caught up.", exact: true })).toBeVisible();
  await expect(page.locator(".caught-up .mascot-saved")).toHaveCSS("opacity", "1");
  await settled(page);
  await page.screenshot({ path: info.outputPath("caught-up.png"), scale: "css" });
});

test("new composer and glass navigation fit narrow phones in both themes", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const theme of ["dark", "light"]) {
    if (theme === "light") {
      await page.getByRole("tab", { name: "Settings", exact: true }).click();
      await page.locator("#appearance-title-section > summary").click();
      await page.getByRole("switch", { name: "Light mode", exact: true }).click();
    }
    await page.getByRole("tab", { name: "Log", exact: true }).click();
    const amount = page.getByRole("textbox", { name: "Amount", exact: true });
    await amount.fill("123456.78");
    if (await page.locator("#panel-log .optional-entry-details").getAttribute("open") === null) await page.locator("#panel-log .optional-entry-details > summary").click();
    await page.getByRole("textbox", { name: "Expense name", exact: false }).fill("A long but perfectly normal expense name");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Save expense", exact: true }).evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    const button = await page.getByRole("button", { name: "Save expense", exact: true }).boundingBox();
    const dock = await page.getByRole("tablist").boundingBox();
    expect(button!.y + button!.height).toBeLessThan(dock!.y);
    await page.waitForTimeout(500); await page.screenshot({ path: info.outputPath(`log-${theme}-320.png`), scale: "css" });
  }
});

test("every tab press restarts a larger question bounce and reduced motion suppresses it", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const name of ["Log", "Entries", "Analytics", "Catch-Up", "Settings", "Settings", "Log"]) {
    await page.locator(".question").evaluate(element => { element.setAttribute("data-previous-bounce", "true"); });
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.locator(".question")).not.toHaveAttribute("data-previous-bounce", "true");
    await expect(page.locator(".question")).toHaveClass(/is-curious/);
    const peak = await page.locator(".question").evaluate(async element => {
      const animation = element.getAnimations().find(animation => (animation as CSSAnimation).animationName === "questionWonder")!;
      animation.pause(); animation.currentTime = 850 * .34;
      await new Promise(requestAnimationFrame);
      const matrix = new DOMMatrix(getComputedStyle(element).transform);
      return { scale: Math.hypot(matrix.a, matrix.b), y: matrix.f, count: element.getAnimations().length };
    });
    expect(peak.scale).toBeGreaterThan(1.45); expect(peak.y).toBeLessThan(-10); expect(peak.count).toBe(1);
    expect((await page.locator(".question").boundingBox())!.y).toBeGreaterThanOrEqual(0);
  }
  await page.getByRole("tab", { name: "Log", exact: true }).focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Entries", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".question")).toHaveClass(/is-curious/);
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await page.locator("#appearance-title-section > summary").click(); await page.getByRole("switch", { name: /Reduce motion/ }).check();
  await page.getByRole("tab", { name: "Log", exact: true }).click();
  expect(await page.locator(".question").evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  expect(errors).toEqual([]);
});
