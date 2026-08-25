import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const api = "http://127.0.0.1:3103/api/v1";

async function mockAuth(request: APIRequestContext, appContext: string) {
  const response = await request.post(`${api}/auth/mock`, { data: { appContext } });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ accessToken: string }>;
}

test.describe("phase 4 trip supply", () => {
  test("serves directories and lets an approved driver create a trip draft", async ({
    request,
  }) => {
    const regions = await request.get(`${api}/regions`);
    expect(regions.ok()).toBeTruthy();
    expect((await regions.json()).regions.length).toBeGreaterThan(0);

    const cities = await request.get(`${api}/cities`);
    expect(cities.ok()).toBeTruthy();
    const cityPayload = (await cities.json()) as { cities: Array<{ id: string; code: string }> };
    const nukus = cityPayload.cities.find((city) => city.code === "nukus");
    const urgench = cityPayload.cities.find((city) => city.code === "urgench");
    expect(nukus).toBeTruthy();
    expect(urgench).toBeTruthy();

    const routes = await request.get(`${api}/routes`);
    expect(routes.ok()).toBeTruthy();
    const routePayload = (await routes.json()) as { routes: Array<{ id: string }> };
    expect(routePayload.routes.length).toBeGreaterThan(0);

    const driver = await mockAuth(request, "DRIVER_APP");
    const created = await request.post(`${api}/trips`, {
      headers: { authorization: `Bearer ${driver.accessToken}` },
      data: {
        routeId: routePayload.routes[0]!.id,
        departureAtUtc: new Date(Date.now() + 10 * 86_400_000).toISOString(),
        passengerSeatCapacity: 2,
        pricePerSeatMinor: 8500000,
        wholeCarPriceMinor: 17000000,
        parcelSupported: true,
        parcelPriceMinor: 2500000,
        luggageRules: "One suitcase",
      },
    });
    expect(created.ok()).toBeTruthy();
    const trip = (await created.json()) as { trip: { id: string; status: string } };
    expect(trip.trip.status).toBe("DRAFT");

    const mine = await request.get(`${api}/trips/mine`, {
      headers: { authorization: `Bearer ${driver.accessToken}` },
    });
    expect(mine.ok()).toBeTruthy();

    const admin = await mockAuth(request, "ADMIN_WEB");
    const adminTrips = await request.get(`${api}/admin/trips`, {
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    expect(adminTrips.ok()).toBeTruthy();
  });
});
