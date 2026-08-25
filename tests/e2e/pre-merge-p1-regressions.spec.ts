import { createHash } from "node:crypto";
import { PrismaClient } from "@nodex/database";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { runScopedId } from "./e2e-fixtures";

const api = "http://127.0.0.1:3103/api/v1";
process.env.DATABASE_URL ??= "postgresql://nodex:nodex@localhost:15432/nodex?schema=public";

const prisma = new PrismaClient();

const p1ReasonPrefix = "P1 regression";
let telegramOffset = 0;

test.describe.configure({ mode: "serial" });

test.afterEach(async () => {
  await prisma.accountRestriction.deleteMany({ where: { reason: { contains: p1ReasonPrefix } } });
});

test.afterAll(async () => {
  await prisma.accountRestriction.deleteMany({ where: { reason: { contains: p1ReasonPrefix } } });
  await prisma.$disconnect();
});

function requestHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value ?? {}))
    .digest("hex");
}

function nextTelegramId() {
  telegramOffset += 1;
  return 910000000 + (Date.now() % 100000) * 100 + telegramOffset;
}

async function mockAuth(
  request: APIRequestContext,
  appContext: "CLIENT_APP" | "DRIVER_APP" | "ADMIN_WEB",
  telegramUserId?: number,
) {
  const response = await request.post(`${api}/auth/mock`, {
    data: { appContext, ...(telegramUserId ? { telegramUserId } : {}) },
  });
  await expect(response).toBeOK();
  return response.json() as Promise<{ accessToken: string; roles: string[]; user: { id: string } }>;
}

async function publicTripId() {
  const trip = await prisma.trip.findFirst({
    where: {
      status: { in: ["PUBLISHED", "BOOKING_OPEN"] },
      departureAtUtc: { gt: new Date() },
      cancelledAt: null,
      blockedAt: null,
      availableSeatCount: { gt: 0 },
      driverProfile: { verificationStatus: "APPROVED" },
      vehicle: { status: "APPROVED", archivedAt: null, suspendedAt: null },
    },
    orderBy: { departureAtUtc: "asc" },
  });
  expect(trip?.id).toBeTruthy();
  return trip!.id;
}

async function firstAvailableSeat(request: APIRequestContext, tripId: string) {
  const seats = await request.get(`${api}/trips/public/${tripId}/seats`);
  await expect(seats).toBeOK();
  const body = (await seats.json()) as { seats: Array<{ seatKey: string; status: string }> };
  const seat = body.seats.find((item) => item.status === "AVAILABLE");
  expect(seat?.seatKey).toBeTruthy();
  return seat!.seatKey;
}

async function restrictUser(input: {
  userId: string;
  createdByUserId: string;
  type:
    | "BOOKING_RESTRICTED"
    | "CHAT_RESTRICTED"
    | "DRIVER_TRIP_CREATION_RESTRICTED"
    | "PARCEL_RESTRICTED";
  testId: string;
}) {
  return prisma.accountRestriction.create({
    data: {
      userId: input.userId,
      type: input.type,
      reason: `${p1ReasonPrefix} ${input.testId} ${input.type}`,
      createdByUserId: input.createdByUserId,
      startsAt: new Date(Date.now() - 60_000),
      endsAt: new Date(Date.now() + 60 * 60_000),
    },
  });
}

async function removeRestriction(restrictionId: string) {
  await prisma.accountRestriction.deleteMany({ where: { id: restrictionId } });
}

async function createApprovedDriverFixture(
  request: APIRequestContext,
  testId: string,
): Promise<{
  auth: { accessToken: string; user: { id: string } };
  driverProfileId: string;
  vehicleId: string;
}> {
  const auth = await mockAuth(request, "DRIVER_APP", nextTelegramId());
  const driverProfile = await prisma.driverProfile.upsert({
    where: { userId: auth.user.id },
    create: {
      userId: auth.user.id,
      onboardingStatus: "BASIC_COMPLETED",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      city: "Nukus",
    },
    update: {
      onboardingStatus: "BASIC_COMPLETED",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      suspendedAt: null,
      suspensionReason: null,
    },
  });
  const vehicle = await prisma.vehicle.create({
    data: {
      driverProfileId: driverProfile.id,
      make: "P1",
      model: "Regression",
      year: 2026,
      color: "Black",
      plateNumber: `P1${testId.slice(-4).toUpperCase()}`,
      normalizedPlate: `P1-${testId}-${Date.now()}`,
      passengerSeatCount: 4,
      passengerSeats: 4,
      isPrimary: true,
      status: "APPROVED",
      moderationStatus: "APPROVED",
      approvedAt: new Date(),
    },
  });
  return { auth, driverProfileId: driverProfile.id, vehicleId: vehicle.id };
}

async function createPublishedTrip(request: APIRequestContext, testId: string) {
  const driver = await createApprovedDriverFixture(request, testId);
  const seedTrip = await prisma.trip.findFirstOrThrow({
    where: { status: { in: ["PUBLISHED", "BOOKING_OPEN"] }, routeId: { not: null } },
    orderBy: { departureAtUtc: "asc" },
  });
  return prisma.trip.create({
    data: {
      driverProfileId: driver.driverProfileId,
      vehicleId: driver.vehicleId,
      routeId: seedTrip.routeId,
      originCityId: seedTrip.originCityId,
      destinationCityId: seedTrip.destinationCityId,
      originCity: seedTrip.originCity,
      destinationCity: seedTrip.destinationCity,
      departureAtUtc: new Date(Date.now() + 20 * 24 * 60 * 60_000),
      passengerSeatCapacity: 4,
      availableSeatCount: 4,
      pricePerSeatMinor: 10000n,
      currency: "UZS",
      status: "PUBLISHED",
      publishedAt: new Date(),
      comment: `${p1ReasonPrefix} ${testId}`,
    },
  });
}

async function createConfirmedBooking(
  request: APIRequestContext,
  testId: string,
  auth?: { accessToken: string; user: { id: string } },
): Promise<{ clientAuth: { accessToken: string; user: { id: string } }; bookingId: string }> {
  const tripId = await publicTripId();
  const clientAuth = auth ?? (await mockAuth(request, "CLIENT_APP", nextTelegramId()));
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  const booking = await prisma.booking.create({
    data: {
      tripId,
      clientId: clientAuth.user.id,
      type: "SEAT",
      status: "CONFIRMED",
      paymentMethod: "CASH",
      currency: "UZS",
      totalMinor: trip.pricePerSeatMinor || 10000n,
      passengerCount: 1,
      clientComment: `${p1ReasonPrefix} ${testId}`,
      confirmedAt: new Date(),
    },
  });
  return { clientAuth, bookingId: booking.id };
}

test.describe("pre-merge P1 reliability regressions", () => {
  test("enforces account restrictions on new sensitive actions", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Stateful API restriction coverage runs once.");
    const testId = runScopedId("p1-restrictions", testInfo);
    const adminAuth = await mockAuth(request, "ADMIN_WEB");
    const clientAuth = await mockAuth(request, "CLIENT_APP", nextTelegramId());
    const driverFixture = await createApprovedDriverFixture(request, testId);

    const trip = await createPublishedTrip(request, `${testId}-booking`);
    const seatKey = await firstAvailableSeat(request, trip.id);
    const bookingRestriction = await restrictUser({
      userId: clientAuth.user.id,
      createdByUserId: adminAuth.user.id,
      type: "BOOKING_RESTRICTED",
      testId,
    });
    const blockedHold = await request.post(`${api}/bookings/holds`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: {
        tripId: trip.id,
        type: "SEAT",
        seatKeys: [seatKey],
        passengerCount: 1,
        paymentMethod: "CASH",
      },
    });
    expect(blockedHold.status()).toBe(403);
    expect(await blockedHold.text()).toContain("BOOKING_RESTRICTED");
    await removeRestriction(bookingRestriction.id);
    const allowedHold = await request.post(`${api}/bookings/holds`, {
      headers: {
        authorization: `Bearer ${clientAuth.accessToken}`,
        "idempotency-key": `${testId}:booking-control`,
      },
      data: {
        tripId: trip.id,
        type: "SEAT",
        seatKeys: [seatKey],
        passengerCount: 1,
        paymentMethod: "CASH",
      },
    });
    expect(allowedHold.status()).toBe(201);

    const { bookingId } = await createConfirmedBooking(request, `${testId}-chat`, clientAuth);
    const chatRestriction = await restrictUser({
      userId: clientAuth.user.id,
      createdByUserId: adminAuth.user.id,
      type: "CHAT_RESTRICTED",
      testId,
    });
    const blockedConversation = await request.post(`${api}/conversations`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: { bookingId },
    });
    expect(blockedConversation.status()).toBe(403);
    expect(await blockedConversation.text()).toContain("CHAT_RESTRICTED");
    await removeRestriction(chatRestriction.id);
    const allowedConversation = await request.post(`${api}/conversations`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: { bookingId },
    });
    expect(allowedConversation.status()).toBe(201);

    const categories = await request.get(`${api}/parcel-categories`);
    await expect(categories).toBeOK();
    const categoryBody = (await categories.json()) as { categories: Array<{ code: string }> };
    const categoryCode = categoryBody.categories[0]?.code;
    expect(categoryCode).toBeTruthy();
    const parcelRestriction = await restrictUser({
      userId: clientAuth.user.id,
      createdByUserId: adminAuth.user.id,
      type: "PARCEL_RESTRICTED",
      testId,
    });
    const blockedParcel = await request.post(`${api}/parcels`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: {
        categoryCode,
        title: "P1 parcel",
        description: "P1 regression parcel payload",
        weightGrams: 500,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 5,
        declaredValueMinor: "1000",
        senderName: "Client",
        recipientName: "Recipient",
        recipientPhone: "+998901112233",
        pickupLabel: "Origin pickup",
        destinationLabel: "Destination pickup",
      },
    });
    expect(blockedParcel.status()).toBe(403);
    expect(await blockedParcel.text()).toContain("PARCEL_RESTRICTED");
    await removeRestriction(parcelRestriction.id);

    const seedTrip = await prisma.trip.findFirstOrThrow({ where: { status: "PUBLISHED" } });
    const draftTrip = await prisma.trip.create({
      data: {
        driverProfileId: driverFixture.driverProfileId,
        vehicleId: driverFixture.vehicleId,
        routeId: seedTrip.routeId,
        originCityId: seedTrip.originCityId,
        destinationCityId: seedTrip.destinationCityId,
        originCity: seedTrip.originCity,
        destinationCity: seedTrip.destinationCity,
        departureAtUtc: new Date(Date.now() + 10 * 24 * 60 * 60_000),
        passengerSeatCapacity: 1,
        availableSeatCount: 1,
        pricePerSeatMinor: 10000n,
        currency: "UZS",
        status: "DRAFT",
        comment: `${p1ReasonPrefix} ${testId} driver publish`,
      },
    });
    const tripRestriction = await restrictUser({
      userId: driverFixture.auth.user.id,
      createdByUserId: adminAuth.user.id,
      type: "DRIVER_TRIP_CREATION_RESTRICTED",
      testId,
    });
    const blockedPublish = await request.post(`${api}/trips/${draftTrip.id}/publish`, {
      headers: { authorization: `Bearer ${driverFixture.auth.accessToken}` },
    });
    expect(blockedPublish.status()).toBe(403);
    expect(await blockedPublish.text()).toContain("DRIVER_TRIP_CREATION_RESTRICTED");
    await removeRestriction(tripRestriction.id);
  });

  test("allows implicit payment retry after terminal payments", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Stateful API payment coverage runs once.");
    const testId = runScopedId("p1-payment-retry", testInfo);
    const terminalStatuses = ["FAILED", "CANCELLED", "EXPIRED"] as const;

    for (const status of terminalStatuses) {
      const { clientAuth, bookingId } = await createConfirmedBooking(
        request,
        `${testId}-${status}`,
      );
      const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      const payload = {
        targetType: "BOOKING" as const,
        targetId: bookingId,
        method: "ONLINE" as const,
        provider: "MOCK" as const,
      };
      const implicitKey = `payment:${clientAuth.user.id}:${requestHash(payload)}`;
      const oldPayment = await prisma.payment.create({
        data: {
          targetType: "BOOKING",
          bookingId,
          payerUserId: clientAuth.user.id,
          method: "ONLINE",
          provider: "MOCK",
          status,
          currency: "UZS",
          amountMinor: booking.totalMinor,
          idempotencyKey: implicitKey,
          ...(status === "FAILED" ? { failedAt: new Date(Date.now() - 60_000) } : {}),
        },
      });

      const retry = await request.post(`${api}/payments/intents`, {
        headers: { authorization: `Bearer ${clientAuth.accessToken}` },
        data: payload,
      });
      expect(retry.status()).toBe(201);
      const retryBody = (await retry.json()) as { payment: { id: string; status: string } };
      expect(retryBody.payment.id).not.toBe(oldPayment.id);
      expect(["CREATED", "PROCESSING", "REQUIRES_ACTION"]).toContain(retryBody.payment.status);

      const duplicate = await request.post(`${api}/payments/intents`, {
        headers: { authorization: `Bearer ${clientAuth.accessToken}` },
        data: payload,
      });
      expect(duplicate.status()).toBe(201);
      const duplicateBody = (await duplicate.json()) as { payment: { id: string } };
      expect(duplicateBody.payment.id).toBe(retryBody.payment.id);
    }

    const { clientAuth, bookingId } = await createConfirmedBooking(request, `${testId}-explicit`);
    const explicitPayload = {
      targetType: "BOOKING" as const,
      targetId: bookingId,
      method: "ONLINE" as const,
      provider: "MOCK" as const,
    };
    const explicitKey = `${testId}:explicit-payment`;
    const firstExplicit = await request.post(`${api}/payments/intents`, {
      headers: {
        authorization: `Bearer ${clientAuth.accessToken}`,
        "idempotency-key": explicitKey,
      },
      data: explicitPayload,
    });
    expect(firstExplicit.status()).toBe(201);
    const firstBody = (await firstExplicit.json()) as { payment: { id: string } };
    const replayExplicit = await request.post(`${api}/payments/intents`, {
      headers: {
        authorization: `Bearer ${clientAuth.accessToken}`,
        "idempotency-key": explicitKey,
      },
      data: explicitPayload,
    });
    expect(replayExplicit.status()).toBe(201);
    const replayBody = (await replayExplicit.json()) as { payment: { id: string } };
    expect(replayBody.payment.id).toBe(firstBody.payment.id);
  });
});
