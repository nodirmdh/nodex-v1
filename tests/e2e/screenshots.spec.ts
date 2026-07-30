import { test } from "@playwright/test";
import { pathToFileURL } from "node:url";

async function capture(page, url: string, path: string) {
  await page.goto(url);
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important}",
  });
  await page.screenshot({ path, fullPage: true });
}

test.describe("acceptance screenshots", () => {
  test("client screenshots", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(
      page,
      "http://127.0.0.1:3100",
      "artifacts/screenshots/client/home-mobile-light.png",
    );
    await page.emulateMedia({ colorScheme: "dark" });
    await capture(
      page,
      "http://127.0.0.1:3100",
      "artifacts/screenshots/client/home-mobile-dark.png",
    );
    await page.emulateMedia({ colorScheme: "light" });
    await capture(
      page,
      "http://127.0.0.1:3100/search",
      "artifacts/screenshots/client/search-mobile.png",
    );
    await capture(
      page,
      "http://127.0.0.1:3100/trip-demo",
      "artifacts/screenshots/client/trip-detail-mobile.png",
    );
    await capture(
      page,
      "http://127.0.0.1:3100/booking-demo",
      "artifacts/screenshots/client/booking-demo-mobile.png",
    );
  });

  test("driver screenshots", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(
      page,
      "http://127.0.0.1:3101",
      "artifacts/screenshots/driver/dashboard-mobile-light.png",
    );
    await page.emulateMedia({ colorScheme: "dark" });
    await capture(
      page,
      "http://127.0.0.1:3101",
      "artifacts/screenshots/driver/dashboard-mobile-dark.png",
    );
    await page.emulateMedia({ colorScheme: "light" });
    await capture(
      page,
      "http://127.0.0.1:3101/trip-demo",
      "artifacts/screenshots/driver/trip-operation.png",
    );
    await capture(
      page,
      "http://127.0.0.1:3101/create-trip-demo",
      "artifacts/screenshots/driver/create-trip-wizard.png",
    );
    await capture(
      page,
      "http://127.0.0.1:3101/passengers-demo",
      "artifacts/screenshots/driver/passengers.png",
    );
  });

  test("admin screenshots", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await capture(
      page,
      "http://127.0.0.1:3102",
      "artifacts/screenshots/admin/dashboard-desktop-light.png",
    );
    await page.emulateMedia({ colorScheme: "dark" });
    await capture(
      page,
      "http://127.0.0.1:3102",
      "artifacts/screenshots/admin/dashboard-desktop-dark.png",
    );
    await page.emulateMedia({ colorScheme: "light" });
    await capture(
      page,
      "http://127.0.0.1:3102/drivers",
      "artifacts/screenshots/admin/drivers-table.png",
    );
    await page.setViewportSize({ width: 768, height: 1024 });
    await capture(
      page,
      "http://127.0.0.1:3102",
      "artifacts/screenshots/admin/mobile-tablet-navigation.png",
    );
  });

  test("storybook screenshots", async ({ page }) => {
    const iframe = pathToFileURL(
      `${process.cwd()}/packages/ui/storybook-static/iframe.html`,
    ).toString();
    await capture(
      page,
      `${iframe}?globals=&id=nodex-foundation--travel-components`,
      "artifacts/screenshots/storybook/trip-card.png",
    );
    await capture(
      page,
      `${iframe}?globals=&id=nodex-foundation--travel-components`,
      "artifacts/screenshots/storybook/seat-map.png",
    );
    await capture(
      page,
      `${iframe}?globals=&id=nodex-foundation--states`,
      "artifacts/screenshots/storybook/timeline.png",
    );
    await capture(
      page,
      `${iframe}?globals=&id=nodex-foundation--buttons-and-badges`,
      "artifacts/screenshots/storybook/admin-table.png",
    );
  });
});
