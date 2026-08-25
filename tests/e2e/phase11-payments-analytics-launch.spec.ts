import { expect, test } from "@playwright/test";

const client = "http://127.0.0.1:3100";
const driver = "http://127.0.0.1:3101";
const admin = "http://127.0.0.1:3102";
const api = "http://127.0.0.1:3103";

test.describe("phase 11 payments analytics launch", () => {
  test("renders client payment guidance surface", async ({ page }) => {
    await page.goto(`${client}/payments`);
    await expect(
      page.getByRole("heading", { name: "Payments", exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Client payment legacy notice" })).toContainText(
      "Ride payments happen outside Nodex",
    );
    await expect(page.getByRole("link", { name: "View trips" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact support" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay cash" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pay online" })).toHaveCount(0);
  });

  test("renders driver earnings and cash settlement surface", async ({ page }) => {
    await page.goto(`${driver}/earnings`);
    await expect(page.getByRole("heading", { name: "Driver earnings" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Driver earnings summary" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Cash settlements" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Earning list" })).toBeVisible();
  });

  test("renders admin finance workspace", async ({ page }) => {
    await page.goto(`${admin}/finance`);
    await expect(page.getByRole("heading", { name: "Finance", level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Finance overview" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Finance policy" })).toContainText(
      "driver subscription revenue",
    );
    await expect(page.getByRole("region", { name: "Finance policy" })).toContainText(
      "No passenger wallet",
    );
  });

  test("renders admin analytics workspace", async ({ page }) => {
    await page.goto(`${admin}/analytics`);
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Analytics dashboard" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Subscription renewal trend" })).toContainText(
      "Mon",
    );
    await expect(page.getByRole("region", { name: "Corridor performance" })).toContainText("Nukus");
  });

  test("exposes payment finance and analytics OpenAPI paths", async ({ request }) => {
    const response = await request.get(`${api}/openapi.json`);
    await expect(response).toBeOK();
    const openapi = (await response.json()) as { paths: Record<string, unknown> };
    expect(openapi.paths["/api/v1/payments/intents"]).toBeTruthy();
    expect(openapi.paths["/api/v1/payments/{paymentId}/refunds"]).toBeTruthy();
    expect(openapi.paths["/api/v1/admin/finance/payments"]).toBeTruthy();
    expect(openapi.paths["/api/v1/admin/finance/payouts"]).toBeTruthy();
    expect(openapi.paths["/api/v1/admin/analytics/metrics"]).toBeTruthy();
  });
});
