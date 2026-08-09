import { expect, test } from "@playwright/test";
import { admin, client, driver } from "./final-acceptance-helpers";

const mobileViewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

const adminViewports = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
];

test.describe("final acceptance viewport matrix", () => {
  for (const viewport of mobileViewports) {
    test(`client mobile ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto(`${client}/search`);
      await expect(page.getByRole("form", { name: "Trip search form" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Search results" })).toBeVisible();
      await page.screenshot({
        path: `artifacts/final-acceptance/mobile/client-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      });
      testInfo.annotations.push({ type: "viewport", description: "client search rendered" });
    });

    test(`driver mobile ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto(`${driver}/trips`);
      await expect(page.getByRole("heading", { name: "Trips" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create trip" })).toBeVisible();
      await page.screenshot({
        path: `artifacts/final-acceptance/mobile/driver-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      });
      testInfo.annotations.push({ type: "viewport", description: "driver trips rendered" });
    });
  }

  for (const viewport of adminViewports) {
    test(`admin viewport ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto(`${admin}/finance`);
      await expect(page.getByRole("heading", { name: "Finance" })).toBeVisible();
      await expect(page.getByRole("table", { name: "Admin payment list" })).toBeVisible();
      await page.goto(`${admin}/trust-safety`);
      await expect(page.getByRole("heading", { name: "Trust & Safety queue" })).toBeVisible();
      await page.screenshot({
        path: `artifacts/final-acceptance/mobile/admin-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      });
      testInfo.annotations.push({
        type: "viewport",
        description: "admin finance and safety rendered",
      });
    });
  }
});
