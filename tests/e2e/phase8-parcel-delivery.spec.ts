import { expect, test } from "@playwright/test";

const client = "http://127.0.0.1:3100";
const driver = "http://127.0.0.1:3101";
const admin = "http://127.0.0.1:3102";
const api = "http://127.0.0.1:3103/api/v1";

test.describe("phase 8 parcel delivery", () => {
  test("serves parcel directory rules without private data", async ({ request }) => {
    const categories = await request.get(`${api}/parcel-categories`);
    await expect(categories).toBeOK();
    expect(await categories.text()).toContain("DOCUMENTS");

    const rules = await request.get(`${api}/parcel-rules`);
    await expect(rules).toBeOK();
    const rulesText = await rules.text();
    expect(rulesText).toContain("maxWeightGrams");
    expect(rulesText).toContain("UNKNOWN_CONTENT");
    expect(rulesText).not.toContain("codeHash");
  });

  test("renders client parcel creation and tracking", async ({ page }) => {
    await page.goto(`${client}/parcels`);
    await expect(page.getByRole("region", { name: "Parcel creation form" })).toContainText(
      "Send a parcel",
    );
    await expect(page.getByRole("button", { name: "Create parcel" })).toBeVisible();
    await expect(page.getByRole("region", { name: "My parcel orders" })).toContainText(
      "READY_FOR_PICKUP",
    );

    await page.goto(`${client}/parcels/phase8-parcel-ready`);
    await expect(page.getByRole("region", { name: "Parcel tracking detail" })).toContainText(
      "Documents envelope",
    );
    await expect(page.getByRole("region", { name: "Parcel pickup code" })).toContainText(
      "Pickup verification",
    );
    await expect(page.getByRole("region", { name: "Parcel lifecycle timeline" })).toContainText(
      "Delivered",
    );
  });

  test("renders driver parcel operations", async ({ page }) => {
    await page.goto(`${driver}/parcels`);
    await expect(page.getByRole("region", { name: "Driver parcel dashboard" })).toContainText(
      "Trip parcels",
    );
    await expect(page.getByRole("region", { name: "Driver parcel list" })).toContainText(
      "Small electronics",
    );
    await expect(page.getByRole("region", { name: "Parcel code verification" })).toContainText(
      "Confirm handover",
    );
    await expect(page.getByRole("button", { name: "Report issue" })).toBeVisible();
  });

  test("renders admin parcel moderation", async ({ page }) => {
    await page.goto(`${admin}/parcels`);
    await expect(page.getByRole("heading", { name: "Parcels" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Admin parcel list" })).toContainText(
      "Documents envelope",
    );
    await expect(page.getByRole("region", { name: "Parcel moderation detail" })).toContainText(
      "Handoff context",
    );
  });
});
