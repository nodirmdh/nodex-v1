import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  ["client home", "http://127.0.0.1:3100"],
  ["client trip detail", "http://127.0.0.1:3100/trip-demo"],
  ["driver dashboard", "http://127.0.0.1:3101"],
  ["admin dashboard", "http://127.0.0.1:3102"],
  ["admin drivers", "http://127.0.0.1:3102/drivers"],
] as const;

for (const [name, url] of routes) {
  test(`has no serious accessibility violations: ${name}`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const severe = results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    );
    expect(severe).toEqual([]);
  });
}
