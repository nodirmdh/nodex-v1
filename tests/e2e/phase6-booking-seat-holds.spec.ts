import { PrismaClient } from "@nodex/database";
import { expect, test, type APIRequestContext, type TestInfo } from "@playwright/test";
import { futureTripSearchDate, runScopedId } from "./e2e-fixtures";

const client = "http://127.0.0.1:3100";
const api = "http://127.0.0.1:3103/api/v1";
process.env.DATABASE_URL ??= "postgresql://nodex:nodex@localhost:15432/nodex?schema=public";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function mockAuth(request: APIRequestContext, appContext: string) {
  const response = await request.post(`${api}/auth/mock`, { data: { appContext } });
  await expect(response).toBeOK();
  return response.json() as Promise<{ accessToken: string; roles: string[]; user: { id: string } }>;
}

async function publicTripId(
  request: APIRequestContext,
  options: {
    destinationCode?: string;
    expectedTripId: string;
    searchDate: string;
    sessionId?: string;
  },
) {
  const cities = await request.get(`${api}/cities`);
  await expect(cities).toBeOK();
  const body = (await cities.json()) as {
    cities: Array<{ id: string; code: string }>;
  };
  const nukus = body.cities.find((city) => city.code === "nukus")?.id;
  const destinationCode = options.destinationCode ?? "urgench";
  const urgench = body.cities.find((city) => city.code === destinationCode)?.id;
  expect(nukus).toBeTruthy();
  expect(urgench).toBeTruthy();

  const search = await request.get(`${api}/trips/search`, {
    params: {
      originCityId: nukus!,
      destinationCityId: urgench!,
      date: options.searchDate,
      passengers: "1",
      sessionId: options.sessionId ?? "phase6-e2e",
    },
  });
  await expect(search).toBeOK();
  const results = (await search.json()) as { trips: Array<{ id: string }> };
  expect(results.trips.map((trip) => trip.id)).toContain(options.expectedTripId);
  return options.expectedTripId;
}

async function resetPhase6TripState(tripId: string) {
  const bookings = await prisma.booking.findMany({ where: { tripId }, select: { id: true } });
  const bookingIds = bookings.map((booking) => booking.id);
  const holds = await prisma.seatHold.findMany({ where: { tripId }, select: { id: true } });
  const holdIds = holds.map((hold) => hold.id);

  await prisma.$transaction(async (tx) => {
    if (bookingIds.length > 0) {
      await tx.chatMessage.deleteMany({
        where: { conversation: { bookingId: { in: bookingIds } } },
      });
      await tx.conversation.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await tx.bookingTimelineEvent.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await tx.bookingOperationEvent.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await tx.bookingCancellation.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await tx.boardingCode.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await tx.bookingBaggage.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await tx.bookingPassenger.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await tx.bookingSeat.deleteMany({ where: { bookingId: { in: bookingIds } } });
    }
    if (holdIds.length > 0) {
      await tx.seatHoldItem.deleteMany({ where: { seatHoldId: { in: holdIds } } });
      await tx.seatHold.deleteMany({ where: { id: { in: holdIds } } });
    }
    if (bookingIds.length > 0) {
      await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }
    await tx.searchEvent.deleteMany({ where: { tripId } });
    await tx.tripSeat.deleteMany({ where: { tripId } });
  });
}

async function createPhase6TripFixture(testInfo: TestInfo, kind: "hold" | "confirm") {
  const fixtureId = runScopedId(`phase6-${kind}`, testInfo);
  const tripId = `${fixtureId}-trip`;
  const searchDate = futureTripSearchDate(kind === "hold" ? 16 : 17);
  const departureAtUtc = new Date(`${searchDate}T05:00:00.000Z`);

  const driver = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000002n } });
  const driverProfile = await prisma.driverProfile.findUniqueOrThrow({
    where: { userId: driver.id },
  });
  const vehicle = await prisma.vehicle.findFirstOrThrow({
    where: { driverProfileId: driverProfile.id, status: "APPROVED", archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const origin = await prisma.city.findUniqueOrThrow({ where: { code: "nukus" } });
  const destination = await prisma.city.findUniqueOrThrow({ where: { code: "khiva" } });
  const route = await prisma.route.findUniqueOrThrow({
    where: {
      originCityId_destinationCityId: {
        originCityId: origin.id,
        destinationCityId: destination.id,
      },
    },
  });

  await resetPhase6TripState(tripId);

  const trip = await prisma.trip.upsert({
    where: { id: tripId },
    create: {
      id: tripId,
      driverProfileId: driverProfile.id,
      vehicleId: vehicle.id,
      routeId: route.id,
      originCityId: origin.id,
      destinationCityId: destination.id,
      originCity: origin.nameRu,
      destinationCity: destination.nameRu,
      departureAtUtc,
      arrivalEstimateAtUtc: new Date(
        departureAtUtc.getTime() + (route.estimatedDurationMinutes ?? 180) * 60_000,
      ),
      timezone: origin.timezone,
      status: "PUBLISHED",
      passengerSeatCapacity: 4,
      availableSeatCount: 4,
      pricePerSeatMinor: 9500000n,
      wholeCarPriceMinor: 38000000n,
      parcelSupported: true,
      parcelPriceMinor: 2500000n,
      currency: "UZS",
      luggageRules: "One suitcase and one small bag per passenger",
      comment: `Phase 6 isolated ${fixtureId}`,
      publishedAt: new Date(),
      publicationValidationSnapshot: { fixture: "phase6", errors: [] },
    },
    update: {
      driverProfileId: driverProfile.id,
      vehicleId: vehicle.id,
      routeId: route.id,
      originCityId: origin.id,
      destinationCityId: destination.id,
      originCity: origin.nameRu,
      destinationCity: destination.nameRu,
      departureAtUtc,
      arrivalEstimateAtUtc: new Date(
        departureAtUtc.getTime() + (route.estimatedDurationMinutes ?? 180) * 60_000,
      ),
      timezone: origin.timezone,
      status: "PUBLISHED",
      passengerSeatCapacity: 4,
      availableSeatCount: 4,
      pricePerSeatMinor: 9500000n,
      wholeCarPriceMinor: 38000000n,
      parcelSupported: true,
      parcelPriceMinor: 2500000n,
      currency: "UZS",
      luggageRules: "One suitcase and one small bag per passenger",
      comment: `Phase 6 isolated ${fixtureId}`,
      publishedAt: new Date(),
      unpublishedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      blockedAt: null,
      blockReason: null,
      publicationValidationSnapshot: { fixture: "phase6", errors: [] },
    },
  });

  const seats = [
    ["FRONT_RIGHT", "Front right", 0, 1, "FRONT"],
    ["ROW_1_LEFT", "Row 1 left", 1, 0, "REAR"],
    ["ROW_1_RIGHT", "Row 1 right", 1, 1, "REAR"],
    ["ROW_2_LEFT", "Row 2 left", 2, 0, "STANDARD"],
  ] as const;
  for (const [seatKey, label, row, column, seatType] of seats) {
    await prisma.tripSeat.upsert({
      where: { tripId_seatKey: { tripId: trip.id, seatKey } },
      create: {
        tripId: trip.id,
        seatKey,
        label,
        row,
        column,
        seatType,
        priceMinor: trip.pricePerSeatMinor,
        status: "AVAILABLE",
      },
      update: {
        label,
        row,
        column,
        seatType,
        priceMinor: trip.pricePerSeatMinor,
        status: "AVAILABLE",
      },
    });
  }
  await prisma.tripSeatSnapshot.upsert({
    where: { tripId: trip.id },
    create: {
      tripId: trip.id,
      vehicleId: vehicle.id,
      passengerSeatCapacity: 4,
      availableSeatCount: 4,
      seatLabels: seats.map(([seatKey]) => seatKey),
    },
    update: {
      vehicleId: vehicle.id,
      passengerSeatCapacity: 4,
      availableSeatCount: 4,
      seatLabels: seats.map(([seatKey]) => seatKey),
    },
  });

  return { tripId: trip.id, searchDate };
}

test.describe("phase 6 booking and seat holds", () => {
  test("exposes public seat inventory and creates an idempotent client hold", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API mutation coverage runs once on desktop.");
    const fixture = await createPhase6TripFixture(testInfo, "hold");
    const tripId = await publicTripId(request, {
      destinationCode: "khiva",
      expectedTripId: fixture.tripId,
      searchDate: fixture.searchDate,
      sessionId: "phase6-hold-e2e",
    });
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

  test("confirms a held booking and surfaces it to driver and admin", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API mutation coverage runs once on desktop.");
    const fixture = await createPhase6TripFixture(testInfo, "confirm");
    const tripId = await publicTripId(request, {
      destinationCode: "khiva",
      expectedTripId: fixture.tripId,
      searchDate: fixture.searchDate,
      sessionId: "phase6-confirm-e2e",
    });
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
    await page.getByRole("link", { name: "Request seat" }).click();
    await expect(page.getByRole("region", { name: "Real car cabin seat picker" })).toContainText(
      "Cabin",
    );
    await page.getByRole("button", { name: "Request this seat" }).click();
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("region", { name: "Booking confirmation" })).toContainText(
      "Seat request created",
    );

    await page.goto(`${client}/bookings`);
    const clientBookings = page.getByRole("region", { name: "Client bookings" });
    await expect(clientBookings).toContainText("Request sent");
    await expect(clientBookings).toContainText("waiting for driver confirmation");

    await page.goto("http://127.0.0.1:3101/passengers-demo");
    await page.getByRole("button", { name: "Passengers" }).click();
    await expect(page.getByRole("region", { name: "Driver booking list" })).toContainText(
      "Confirmed",
    );

    await page.goto("http://127.0.0.1:3102/bookings");
    await expect(page.getByRole("heading", { name: "Seat Requests" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Admin booking list" })).toContainText(
      "Pending driver",
    );
    await expect(page.getByRole("region", { name: "Seat request detail" })).toContainText(
      "Arranged directly with driver",
    );
  });
});
