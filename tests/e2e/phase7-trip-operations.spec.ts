import { PrismaClient } from "@nodex/database";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { phase7BookingId } from "./e2e-fixtures";

const client = "http://127.0.0.1:3100";
const api = "http://127.0.0.1:3103/api/v1";

process.env.DATABASE_URL ??= "postgresql://nodex:nodex@localhost:15432/nodex?schema=public";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function resetPhase7OperationFixture(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { seats: true, trip: { include: { driverProfile: true } } },
  });
  if (!booking) return;

  await prisma.$transaction(async (tx) => {
    await tx.boardingCode.deleteMany({ where: { bookingId } });
    await tx.bookingOperationEvent.deleteMany({ where: { bookingId } });
    await tx.bookingTimelineEvent.deleteMany({ where: { bookingId } });
    await tx.bookingSeat.updateMany({
      where: { bookingId },
      data: { status: "BOOKED" },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "BOARDING",
        cancelledAt: null,
        cancellationReason: null,
      },
    });
    await tx.tripExecution.deleteMany({ where: { tripId: booking.tripId } });
    await tx.tripOperationEvent.deleteMany({ where: { tripId: booking.tripId } });
    await tx.tripStatusTransition.deleteMany({ where: { tripId: booking.tripId } });
    await tx.tripCompletionSummary.deleteMany({ where: { tripId: booking.tripId } });
    await tx.noShowRecord.deleteMany({ where: { tripId: booking.tripId } });
    await tx.trip.update({
      where: { id: booking.tripId },
      data: {
        status: "BOARDING",
        availableSeatCount: 3,
        blockedAt: null,
        blockReason: null,
        cancelledAt: null,
        cancellationReason: null,
      },
    });
    await tx.tripSeat.updateMany({
      where: { tripId: booking.tripId },
      data: { status: "AVAILABLE" },
    });
    await tx.tripSeat.updateMany({
      where: {
        tripId: booking.tripId,
        seatKey: { in: booking.seats.map((seat) => seat.seatKey) },
      },
      data: { status: "BOOKED" },
    });
    await tx.tripOperationEvent.create({
      data: {
        tripId: booking.tripId,
        actorUserId: booking.trip.driverProfile.userId,
        type: "TRIP_BOARDING",
        payload: { fixture: true, reset: true },
      },
    });
    await tx.bookingTimelineEvent.create({
      data: { bookingId, actorUserId: booking.clientId, type: "BOOKING_BOARDING_READY" },
    });
    await tx.bookingOperationEvent.create({
      data: {
        bookingId,
        actorUserId: booking.clientId,
        type: "BOOKING_BOARDING_READY",
        payload: { fixture: true, reset: true },
      },
    });
  });
}

async function mockAuth(request: APIRequestContext, appContext: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request.post(`${api}/auth/mock`, { data: { appContext } });
    if (response.ok()) {
      return response.json() as Promise<{
        accessToken: string;
        roles: string[];
        user: { id: string };
      }>;
    }
    const text = await response.text();
    if (!text.includes("P2028") || attempt === 2) {
      expect(response.ok(), text).toBeTruthy();
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("mock auth retry exhausted");
}

test.describe("phase 7 trip operations", () => {
  test("runs boarding, start, complete, and admin operation visibility", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API mutation coverage runs once on desktop.");
    const bookingId = phase7BookingId(testInfo);
    await resetPhase7OperationFixture(bookingId);
    const clientAuth = await mockAuth(request, "CLIENT_APP");
    const codeResponse = await request.post(
      `${api}/bookings/${bookingId}/boarding-code/regenerate`,
      {
        headers: {
          authorization: `Bearer ${clientAuth.accessToken}`,
          "idempotency-key": `phase7-regenerate-code-${bookingId}`,
        },
        data: { reason: "Phase 7 E2E code visibility" },
      },
    );
    await expect(codeResponse).toBeOK();
    const codeBody = (await codeResponse.json()) as {
      boardingCode: { code?: string; status: string };
    };
    expect(codeBody.boardingCode.code).toMatch(/^\d{6}$/);

    const driverAuth = await mockAuth(request, "DRIVER_APP");
    const statusBefore = await request.get(`${api}/bookings/${bookingId}/operation-status`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
    });
    await expect(statusBefore).toBeOK();
    const statusBeforeBody = (await statusBefore.json()) as {
      status: { tripId: string; bookingStatus: string };
    };
    expect(statusBeforeBody.status.bookingStatus).toBe("BOARDING");
    const tripId = statusBeforeBody.status.tripId;

    const passengerResponse = await request.get(`${api}/driver/trips/${tripId}/passengers`, {
      headers: { authorization: `Bearer ${driverAuth.accessToken}` },
    });
    await expect(passengerResponse).toBeOK();

    const boardResponse = await request.post(`${api}/driver/bookings/${bookingId}/board`, {
      headers: {
        authorization: `Bearer ${driverAuth.accessToken}`,
        "idempotency-key": `phase7-board-confirmed-${bookingId}`,
      },
      data: { code: codeBody.boardingCode.code },
    });
    await expect(boardResponse).toBeOK();

    const startResponse = await request.post(`${api}/driver/trips/${tripId}/start`, {
      headers: {
        authorization: `Bearer ${driverAuth.accessToken}`,
        "idempotency-key": `phase7-start-trip-${bookingId}`,
      },
      data: { allowUnresolvedPassengers: true },
    });
    await expect(startResponse).toBeOK();
    expect((await startResponse.text()).includes("IN_PROGRESS")).toBeTruthy();

    const statusResponse = await request.get(`${api}/bookings/${bookingId}/operation-status`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
    });
    await expect(statusResponse).toBeOK();
    expect((await statusResponse.text()).includes("IN_PROGRESS")).toBeTruthy();

    const completeResponse = await request.post(`${api}/driver/trips/${tripId}/complete`, {
      headers: {
        authorization: `Bearer ${driverAuth.accessToken}`,
        "idempotency-key": `phase7-complete-trip-${bookingId}`,
      },
      data: { notes: "Phase 7 E2E completion" },
    });
    await expect(completeResponse).toBeOK();
    expect((await completeResponse.text()).includes("COMPLETED")).toBeTruthy();

    const adminAuth = await mockAuth(request, "ADMIN_WEB");
    const operations = await request.get(`${api}/admin/trips/${tripId}/operations`, {
      headers: { authorization: `Bearer ${adminAuth.accessToken}` },
    });
    await expect(operations).toBeOK();
    expect((await operations.text()).includes("TRIP_COMPLETED")).toBeTruthy();
  });

  test("renders operational client, driver, and admin surfaces", async ({ page }) => {
    await page.goto(`${client}/bookings/phase6-booking-confirmed`);
    await expect(page.getByRole("region", { name: "Boarding state" })).toContainText(
      "Boarding code",
    );
    await expect(page.getByRole("region", { name: "Trip operation status" })).toContainText(
      "Completed",
    );

    await page.goto("http://127.0.0.1:3101/passengers-demo");
    await expect(page.getByRole("region", { name: "Driver operation dashboard" })).toContainText(
      "Boarding",
    );
    await page.getByRole("button", { name: "Boarding" }).click();
    await expect(page.getByRole("region", { name: "Boarding code verification" })).toContainText(
      "Confirm boarding",
    );

    await page.goto("http://127.0.0.1:3102/trips");
    const tripOperationDetail = page.getByRole("region", { name: "Trip operation detail" });
    await expect(tripOperationDetail).toContainText("Cancel trip");
    await expect(tripOperationDetail).toContainText("Boarding window opened");
  });
});
