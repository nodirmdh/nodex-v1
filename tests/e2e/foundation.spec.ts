import { expect, test } from "@playwright/test";

const client = "http://127.0.0.1:3100";
const driver = "http://127.0.0.1:3101";
const admin = "http://127.0.0.1:3102";
const api = "http://127.0.0.1:3103";

test.describe("client mini app foundation", () => {
  test("renders home shell and key controls", async ({ page }) => {
    await page.goto(client);
    await expect(page.getByText("Intercity trips and parcels")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "From" })).toHaveValue("Nukus");
    await expect(page.getByRole("textbox", { name: "To" })).toHaveValue("Urgench");
    await expect(page.getByLabel("Swap route")).toBeVisible();
    await expect(page.getByRole("button", { name: "Search trips" })).toBeVisible();
    await expect(page.getByText("Recommended")).toBeVisible();
    await expect(page.getByRole("navigation")).toContainText("Profile");
  });

  test("supports foundation navigation routes", async ({ page }) => {
    await page.goto(`${client}/search`);
    await expect(page.getByText("Find a reliable route")).toBeVisible();
    await page.goto(`${client}/trip-demo`);
    await expect(page.getByText("Route timeline")).toBeVisible();
    await page.goto(`${client}/profile`);
    await expect(page.getByText("Local preview user")).toBeVisible();
  });
});

test.describe("driver mini app foundation", () => {
  test("renders dashboard and route operation shell", async ({ page }) => {
    await page.goto(driver);
    await expect(page.getByText("Driver verification")).toBeVisible();
    const statusPanel = page.getByLabel("Verification progress").locator("..");
    await expect(statusPanel).toContainText("Current status");
    await expect(statusPanel).toContainText("Draft");
    await expect(page.getByRole("textbox", { name: "Legal first name" })).toBeVisible();
    const verificationForm = page.getByRole("main").filter({
      has: page.getByLabel("Verification progress"),
    });
    await expect(verificationForm.getByRole("button", { name: "Next", exact: true })).toBeVisible();
  });

  test("renders create trip mock wizard", async ({ page }) => {
    await page.goto(`${driver}/create-trip-demo`);
    await expect(page.getByText("Wizard demo")).toBeVisible();
    await expect(page.getByText("Route", { exact: true })).toBeVisible();
    await expect(page.getByText("Chevrolet Cobalt")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue demo" })).toBeVisible();
  });

  test("renders vehicle management shell", async ({ page }) => {
    await page.goto(`${driver}/vehicles`);
    await expect(page.getByRole("heading", { name: "Vehicles" })).toBeVisible();
    const vehicleList = page.getByLabel("Driver vehicle list");
    await expect(vehicleList).toBeVisible();
    await expect(vehicleList.getByRole("button", { name: /Chevrolet Tracker/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add vehicle" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review status" })).toBeVisible();
  });
});

test.describe("admin web foundation", () => {
  test("renders admin dashboard shell", async ({ page }) => {
    await page.goto(admin);
    await expect(page.getByText("Nodex Admin")).toBeVisible();
    await expect(page.getByText("Published trips")).toBeVisible();
    await expect(page.getByText("Recent operational events")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open command palette" })).toBeVisible();
  });

  test("renders drivers table and detail panel", async ({ page }) => {
    await page.goto(`${admin}/drivers`);
    await expect(page.getByRole("heading", { name: "Driver verification" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Driver verification queue" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row", { name: /Phase2 Driver 2/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Decision" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.getByText("Application submitted")).toBeVisible();
  });

  test("renders vehicle moderation queue and detail panel", async ({ page }) => {
    await page.goto(`${admin}/vehicles`);
    await expect(page.getByRole("heading", { name: "Vehicle moderation" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Vehicle moderation queue" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row", { name: /Chevrolet Lacetti/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Photo gallery" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
  });
});

test.describe("api foundation", () => {
  test("serves health, meta, swagger, and errors", async ({ request }) => {
    await expect((await request.get(`${api}/api/v1/health`)).status()).toBe(200);
    await expect((await request.get(`${api}/api/v1/health/live`)).status()).toBe(200);
    await expect((await request.get(`${api}/api/v1/health/ready`)).status()).toBe(200);
    const meta = await request.get(`${api}/api/v1/meta`);
    await expect(meta).toBeOK();
    await expect(await request.get(`${api}/openapi.json`)).toBeOK();
    await expect(await request.get(`${api}/docs`)).toBeOK();
    const missing = await request.get(`${api}/api/v1/missing`);
    expect(missing.status()).toBe(404);
    expect(missing.headers()["x-request-id"]).toBeTruthy();
  });
});
