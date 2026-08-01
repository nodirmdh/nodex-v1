import { expect, test, type APIRequestContext } from "@playwright/test";

const client = "http://127.0.0.1:3100";
const api = "http://127.0.0.1:3103/api/v1";

async function mockAuth(request: APIRequestContext, appContext: string) {
  const response = await request.post(`${api}/auth/mock`, { data: { appContext } });
  await expect(response).toBeOK();
  return response.json() as Promise<{ accessToken: string; roles: string[]; user: { id: string } }>;
}

async function publicTripId(request: APIRequestContext) {
  const cities = await request.get(`${api}/cities`);
  await expect(cities).toBeOK();
  const body = (await cities.json()) as {
    cities: Array<{ id: string; code: string }>;
  };
  const nukus = body.cities.find((city) => city.code === "nukus")?.id;
  const urgench = body.cities.find((city) => city.code === "urgench")?.id;
  expect(nukus).toBeTruthy();
  expect(urgench).toBeTruthy();

  const search = await request.get(`${api}/trips/search`, {
    params: {
      originCityId: nukus!,
      destinationCityId: urgench!,
      date: "2026-08-08",
      passengers: "1",
      sessionId: "phase6-e2e",
    },
  });
  await expect(search).toBeOK();
  const results = (await search.json()) as { trips: Array<{ id: string }> };
  const tripId = results.trips[0]?.id;
  expect(tripId).toBeTruthy();
  return tripId!;
}

test.describe("phase 6 booking and seat holds", () => {
  test("exposes public seat inventory and creates an idempotent client hold", async ({
    request,
  }) => {
    const tripId = await publicTripId(request);
    const seats = await request.get(`${api}/trips/public/${tripId}/seats`);
    await expect(seats).toBeOK();
    const seatBody = (await seats.json()) as {
      seats: Array<{ seatKey: string; status: string; priceMinor: string }>;
    };
    const available = seatBody.seats.find((seat) => seat.status === "AVAILABLE");
    expect(available?.seatKey).toBeTruthy();

    const auth = await mockAuth(request, "CLIENT_APP");
    const idempotencyKey = `phase6-hold-${Date.now()}`;
    const create = await request.post(`${api}/bookings/holds`, {
      headers: { authorization: `Bearer ${auth.accessToken}`, "idempotency-key": idempotencyKey },
      data: {
        tripId,
        type: "SEAT",
        seatKeys: [available!.seatKey],
        passengerCount: 1,
        paymentMethod: "CASH",
      },
    });
    expect(create.status()).toBe(201);
    const created = (await create.json()) as { hold: { id: string }; booking: { id: string } };
    expect(created.hold.id).toBeTruthy();

    const replay = await request.post(`${api}/bookings/holds`, {
      headers: { authorization: `Bearer ${auth.accessToken}`, "idempotency-key": idempotencyKey },
      data: {
        tripId,
        type: "SEAT",
        seatKeys: [available!.seatKey],
        passengerCount: 1,
        paymentMethod: "CASH",
      },
    });
    expect(replay.status()).toBe(201);
    expect(((await replay.json()) as { hold: { id: string } }).hold.id).toBe(created.hold.id);

    const release = await request.delete(`${api}/bookings/holds/${created.hold.id}`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    await expect(release).toBeOK();

    const releasedSeats = await request.get(`${api}/trips/public/${tripId}/seats`);
    await expect(releasedSeats).toBeOK();
    const releasedBody = (await releasedSeats.json()) as {
      seats: Array<{ seatKey: string; status: string }>;
    };
    expect(releasedBody.seats.find((seat) => seat.seatKey === available!.seatKey)?.status).toBe(
      "AVAILABLE",
    );
  });

  test("confirms a held booking and surfaces it to driver and admin", async ({ request }) => {
    const tripId = await publicTripId(request);
    const seats = await request.get(`${api}/trips/public/${tripId}/seats`);
    const seatBody = (await seats.json()) as { seats: Array<{ seatKey: string; status: string }> };
    const available = seatBody.seats.find((seat) => seat.status === "AVAILABLE");
    expect(available?.seatKey).toBeTruthy();

    const clientAuth = await mockAuth(request, "CLIENT_APP");
    const create = await request.post(`${api}/bookings/holds`, {
      headers: {
        authorization: `Bearer ${clientAuth.accessToken}`,
        "idempotency-key": `phase6-confirm-${Date.now()}`,
      },
      data: {
        tripId,
        type: "SEAT",
        seatKeys: [available!.seatKey],
        passengerCount: 1,
        paymentMethod: "MANUAL_TRANSFER",
      },
    });
    expect(create.status()).toBe(201);
    const hold = (await create.json()) as { hold: { id: string } };

    const confirm = await request.post(`${api}/bookings/holds/${hold.hold.id}/confirm`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: {
        passengers: [{ firstName: "E2E", lastName: "Passenger", ageCategory: "ADULT" }],
        baggage: [{ type: "SUITCASE", quantity: 1, weightKg: 10 }],
        paymentMethod: "MANUAL_TRANSFER",
        consentAccepted: true,
      },
    });
    await expect(confirm).toBeOK();
    const confirmed = (await confirm.json()) as {
      booking: { id: string; status: string; seats: Array<{ seatKey: string }> };
    };
    expect(confirmed.booking.status).toBe("CONFIRMED");
    expect(confirmed.booking.seats[0]?.seatKey).toBe(available!.seatKey);

    const driverAuth = await mockAuth(request, "DRIVER_APP");
    const driverBookings = await request.get(`${api}/driver/trips/${tripId}/bookings`, {
      headers: { authorization: `Bearer ${driverAuth.accessToken}` },
    });
    await expect(driverBookings).toBeOK();
    expect((await driverBookings.text()).includes(confirmed.booking.id)).toBeTruthy();

    const adminAuth = await mockAuth(request, "ADMIN_WEB");
    const adminBooking = await request.get(`${api}/admin/bookings/${confirmed.booking.id}`, {
      headers: { authorization: `Bearer ${adminAuth.accessToken}` },
    });
    await expect(adminBooking).toBeOK();
    expect(((await adminBooking.json()) as { booking: { status: string } }).booking.status).toBe(
      "CONFIRMED",
    );
  });

  test("renders client seat picker, bookings list, driver bookings, and admin operations", async ({
    page,
  }) => {
    await page.goto(`${client}/trips/phase5-nukus-urgench-morning`);
    await page.getByRole("link", { name: "Choose seats" }).click();
    await expect(page.getByRole("region", { name: "Seat picker" })).toContainText(
      "Available seats",
    );
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("region", { name: "Booking confirmation" })).toContainText(
      "Booking confirmed",
    );

    await page.goto(`${client}/bookings`);
    await expect(page.getByRole("region", { name: "Client bookings" })).toContainText("CONFIRMED");

    await page.goto("http://127.0.0.1:3101/passengers-demo");
    await expect(page.getByRole("region", { name: "Driver booking list" })).toContainText(
      "PENDING_CONFIRMATION",
    );

    await page.goto("http://127.0.0.1:3102/bookings");
    await expect(page.getByRole("table", { name: "Admin booking list" })).toContainText(
      "CONFIRMED",
    );
    await expect(page.getByRole("region", { name: "Booking detail panel" })).toContainText(
      "Timeline",
    );
  });
});
