import { expect, test } from "@playwright/test";

const client = "http://127.0.0.1:3100";
const driver = "http://127.0.0.1:3101";
const admin = "http://127.0.0.1:3102";
const api = "http://127.0.0.1:3103";

test.describe("client mini app foundation", () => {
  test("renders home shell and key controls", async ({ page }) => {
    await page.goto(client);
    await expect(page.getByRole("heading", { name: "Where to today?", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tomorrow" })).toBeVisible();
    await expect(page.getByRole("button", { name: "2 passengers" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Tomorrow, 08:30 Nukus Urgench/ })).toBeVisible();
    await expect(page.getByLabel("Swap origin and destination")).toBeVisible();
    await expect(page.getByRole("link", { name: "Search trips" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recommended rides" })).toBeVisible();
    await expect(page.getByRole("navigation")).toContainText("Profile");
  });

  test("supports foundation navigation routes", async ({ page }) => {
    await page.goto(`${client}/search`);
    await expect(page.getByRole("heading", { name: "Available rides" })).toBeVisible();
    await page.goto(`${client}/trip-demo`);
    await expect(page.getByText("Route timeline")).toBeVisible();
    await page.goto(`${client}/profile`);
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByText("Notifications")).toBeVisible();
  });
});

test.describe("driver mini app foundation", () => {
  test("renders dashboard and route operation shell", async ({ page }) => {
    await page.goto(driver);
    await expect(page.getByRole("heading", { name: "Good morning" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Driver subscription status" })).toContainText(
      "Subscription active",
    );
    await expect(page.getByRole("region", { name: "Create trip access" })).toContainText(
      "Create trip",
    );
    await expect(page.getByRole("link", { name: "+ Create trip" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Next driver trip" })).toContainText(
      "Nukus → Urgench",
    );
    await expect(page.getByRole("navigation")).toContainText("Requests");
  });

  test("renders driver subscription access states", async ({ page }) => {
    await page.goto(`${driver}/subscription`);
    await expect(
      page.getByRole("heading", { name: "Subscription", exact: true, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Driver subscription access rules" }),
    ).toContainText("Publish trips");

    await page.goto(`${driver}/?subscription=expired`);
    await expect(page.getByRole("region", { name: "Create trip access" })).toContainText(
      "Blocked until subscription is active",
    );
    await expect(
      page.getByRole("link", { name: "Activate subscription to create trips" }),
    ).toBeVisible();
  });

  test("renders create trip mock wizard", async ({ page }) => {
    await page.goto(`${driver}/create-trip-demo`);
    await expect(page.getByText("Trip setup")).toBeVisible();
    await expect(page.getByText("Route", { exact: true })).toBeVisible();
    await expect(page.getByText("Chevrolet Cobalt")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("renders trip management shell", async ({ page }) => {
    await page.goto(`${driver}/trips`);
    const tripsOverview = page.getByRole("region", { name: "Driver trips overview" });
    await expect(tripsOverview.getByRole("heading", { name: "Trips", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Driver trip list")).toBeVisible();
    await expect(page.getByRole("region", { name: "Create trip wizard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create trip", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Upcoming trip Nukus → Urgench" })).toContainText(
      "View trip",
    );
  });

  test("renders vehicle management shell", async ({ page }) => {
    await page.goto(`${driver}/vehicles`);
    await expect(page.getByRole("heading", { name: "Vehicles" })).toBeVisible();
    const vehicleList = page.getByLabel("Driver vehicle list");
    await expect(vehicleList).toBeVisible();
    await expect(vehicleList).toContainText("Chevrolet Tracker");
    await expect(page.getByRole("button", { name: "Add vehicle" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Current vehicle" })).toContainText("Approved");
  });
});

test.describe("admin web foundation", () => {
  test("renders admin dashboard shell", async ({ page }) => {
    await page.goto(admin);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(page.getByText("Active trips")).toBeVisible();
    await expect(page.getByRole("region", { name: "Recent operational events" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open command palette" })).toBeVisible();
  });

  test("renders drivers table and detail panel", async ({ page }) => {
    await page.goto(`${admin}/drivers`);
    await expect(page.getByRole("heading", { name: "Drivers", level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Drivers management table" })).toBeVisible();
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
    await expect(page.getByRole("row", { name: /Chevrolet Cobalt/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Photo gallery" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
  });

  test("renders route directory administration", async ({ page }) => {
    await page.goto(`${admin}/routes`);
    await expect(page.getByRole("heading", { name: "Route directory" })).toBeVisible();
    const routeTable = page.getByRole("region", { name: "Route directory table" });
    await expect(routeTable).toBeVisible();
    await expect(routeTable.getByRole("row", { name: /Nukus.*Urgench/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pickup points" })).toBeVisible();
  });

  test("renders trip supply administration", async ({ page }) => {
    await page.goto(`${admin}/trips`);
    await expect(page.getByRole("heading", { name: "Trip supply" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Admin trips table" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Moderation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Block", exact: true })).toBeVisible();
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
