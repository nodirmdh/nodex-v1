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
      await expect(page.getByRole("heading", { name: "Available rides", level: 1 })).toBeVisible();
      await expect(page.getByRole("region", { name: "Quick filters" })).toContainText("Parcel");
      await expect(page.getByRole("link").filter({ hasText: "Azizbek Karimov" })).toBeVisible();
      await page.screenshot({
        path: `artifacts/final-acceptance/mobile/client-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      });
      testInfo.annotations.push({ type: "viewport", description: "client search rendered" });
    });

    test(`driver mobile ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto(`${driver}/trips`);
      const tripsOverview = page.getByRole("region", { name: "Driver trips overview" });
      await expect(tripsOverview.getByRole("heading", { name: "Trips", level: 1 })).toBeVisible();
      await expect(tripsOverview.getByRole("link", { name: "Create trip" })).toBeVisible();
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
      await expect(page.getByRole("region", { name: "Finance overview" })).toContainText(
        "Subscription revenue",
      );
      await expect(page.getByRole("region", { name: "Finance policy" })).toContainText(
        "driver subscription revenue",
      );
      await page.goto(`${admin}/trust-safety`);
      await expect(page.getByRole("heading", { name: "Reviews", level: 1 })).toBeVisible();
      await expect(page.getByRole("region", { name: "Review moderation queue" })).toContainText(
        "Flagged",
      );
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
