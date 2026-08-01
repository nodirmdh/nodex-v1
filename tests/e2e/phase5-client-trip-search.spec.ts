import { expect, test, type APIRequestContext } from "@playwright/test";

const client = "http://127.0.0.1:3100";
const api = "http://127.0.0.1:3103";
const privateFieldNames = new Set([
  "phone",
  "telegramIdentity",
  "telegramUserId",
  "plateNumber",
  "normalizedPlate",
  "storageKey",
  "documents",
  "files",
  "audit",
  "moderationEvents",
  "moderationReviews",
]);

function fieldNames(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(fieldNames);
  return Object.entries(value).flatMap(([key, item]) => [key, ...fieldNames(item)]);
}

async function cityIds(request: APIRequestContext) {
  const response = await request.get(`${api}/api/v1/cities`);
  await expect(response).toBeOK();
  const body = (await response.json()) as {
    cities: Array<{ id: string; code: string; nameRu: string }>;
  };
  return {
    nukus: body.cities.find((city) => city.code === "nukus")?.id,
    urgench: body.cities.find((city) => city.code === "urgench")?.id,
  };
}

test.describe("phase 5 public trip search", () => {
  test("returns future approved public trips without private fields", async ({ request }) => {
    const ids = await cityIds(request);
    expect(ids.nukus).toBeTruthy();
    expect(ids.urgench).toBeTruthy();

    const response = await request.get(`${api}/api/v1/trips/search`, {
      params: {
        originCityId: ids.nukus!,
        destinationCityId: ids.urgench!,
        date: "2026-08-08",
        passengers: "2",
        sort: "price_asc",
        parcelSupported: "false",
        sessionId: "phase5-e2e-session",
      },
    });
    await expect(response).toBeOK();
    const body = (await response.json()) as {
      trips: Array<Record<string, unknown>>;
      pagination: { total: number };
    };

    expect(body.pagination.total).toBeGreaterThan(0);
    expect(body.trips[0]).toMatchObject({
      originCity: "Nukus",
      destinationCity: "Urgench",
      currency: "UZS",
    });
    expect(fieldNames(body.trips[0]).filter((field) => privateFieldNames.has(field))).toEqual([]);
  });

  test("opens public trip detail and records a privacy-safe intent event", async ({ request }) => {
    const ids = await cityIds(request);
    const search = await request.get(`${api}/api/v1/trips/search`, {
      params: {
        originCityId: ids.nukus!,
        destinationCityId: ids.urgench!,
        date: "2026-08-08",
        passengers: "1",
        sessionId: "phase5-e2e-session",
      },
    });
    const body = (await search.json()) as { trips: Array<{ id: string }> };
    const tripId = body.trips[0]?.id;
    expect(tripId).toBeTruthy();

    const detail = await request.get(`${api}/api/v1/trips/public/${tripId}`);
    await expect(detail).toBeOK();
    const detailBody = (await detail.json()) as { trip: Record<string, unknown> };
    expect(detailBody.trip).toHaveProperty("driver");
    expect(detailBody.trip).toHaveProperty("vehicle");
    expect(fieldNames(detailBody.trip).filter((field) => privateFieldNames.has(field))).toEqual([]);

    const event = await request.post(`${api}/api/v1/search-events`, {
      data: {
        type: "BOOKING_CTA_CLICKED",
        tripId,
        originCityId: ids.nukus,
        destinationCityId: ids.urgench,
        passengers: 1,
        sessionId: "phase5-e2e-session",
        filters: { source: "detail" },
      },
    });
    expect(event.status()).toBe(202);
  });

  test("renders client search, filters, recent searches, and public detail CTA", async ({
    page,
  }) => {
    await page.goto(`${client}/search`);
    await expect(page.getByRole("form", { name: "Trip search form" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Search results" })).toContainText(
      "Available trips",
    );
    await page.getByRole("checkbox", { name: "Parcel" }).check();
    await page.getByRole("button", { name: "Search trips" }).click();
    await expect(page.getByRole("region", { name: "Recent searches" })).toContainText(
      "Nukus to Urgench",
    );
    await page.getByRole("link", { name: "View 08:30" }).click();
    await expect(page.getByRole("heading", { name: /Nukus to/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Choose seats" })).toBeVisible();
    await expect(page.getByText("Choose a seat, add passenger details")).toBeVisible();
  });
});
