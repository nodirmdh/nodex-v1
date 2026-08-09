import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const mode = process.argv[2] ?? "reset";
const guardedModes = new Set(["reset", "seed", "scenario"]);

function requireAcceptanceMode() {
  if (!guardedModes.has(mode)) {
    throw new Error(`Unknown acceptance mode: ${mode}`);
  }
  if (process.env.ACCEPTANCE_MODE !== "true") {
    throw new Error("ACCEPTANCE_MODE=true is required for acceptance data commands");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Acceptance data commands are disabled in production");
  }
}

async function clientUserId() {
  return (
    await prisma.user.findUniqueOrThrow({
      where: { telegramId: 900000003n },
      select: { id: true },
    })
  ).id;
}

async function driverUserId() {
  return (
    await prisma.user.findUniqueOrThrow({
      where: { telegramId: 900000002n },
      select: { id: true },
    })
  ).id;
}

async function driverProfileId() {
  const userId = await driverUserId();
  return (
    await prisma.driverProfile.findUniqueOrThrow({
      where: { userId },
      select: { id: true },
    })
  ).id;
}

async function resetBookingOperationFixture() {
  const booking = await prisma.booking.findUnique({
    where: { id: "phase6-booking-confirmed" },
    include: { seats: true },
  });
  if (!booking) return;

  await prisma.$transaction(async (tx) => {
    await tx.bookingOperationEvent.deleteMany({ where: { bookingId: booking.id } });
    await tx.boardingCode.deleteMany({ where: { bookingId: booking.id } });
    await tx.bookingSeat.updateMany({
      where: { bookingId: booking.id },
      data: { status: "BOOKED" },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        paymentMethod: "CASH",
        confirmedAt: new Date("2026-08-01T10:00:00.000Z"),
        cancelledAt: null,
        cancellationReason: null,
      },
    });
    await tx.trip.update({
      where: { id: booking.tripId },
      data: {
        status: "PUBLISHED",
        blockedAt: null,
        blockReason: null,
        cancelledAt: null,
        cancellationReason: null,
      },
    });
    await tx.tripExecution.deleteMany({ where: { tripId: booking.tripId } });
    await tx.tripOperationEvent.deleteMany({ where: { tripId: booking.tripId } });
    await tx.tripStatusTransition.deleteMany({ where: { tripId: booking.tripId } });
    await tx.tripCancellation.deleteMany({ where: { tripId: booking.tripId } });
    await tx.tripCompletionSummary.deleteMany({ where: { tripId: booking.tripId } });
    await tx.noShowRecord.deleteMany({ where: { tripId: booking.tripId } });
    await tx.tripSeat.updateMany({
      where: { tripId: booking.tripId },
      data: { status: "AVAILABLE" },
    });
    await tx.tripSeat.updateMany({
      where: { tripId: booking.tripId, seatKey: { in: booking.seats.map((seat) => seat.seatKey) } },
      data: { status: "BOOKED" },
    });
  });
}

async function resetMutableAcceptanceState() {
  const clientId = await clientUserId();
  const driverId = await driverUserId();
  const profileId = await driverProfileId();

  await prisma.$transaction(async (tx) => {
    await tx.trustedContact.deleteMany({ where: { ownerUserId: clientId } });

    await tx.userBlock.deleteMany({ where: { blockerUserId: clientId, blockedUserId: driverId } });

    const reviews = await tx.review.findMany({
      where: { reviewerUserId: clientId, text: { startsWith: "Acceptance " } },
      select: { id: true },
    });
    await tx.reviewCriterionScore.deleteMany({
      where: { reviewId: { in: reviews.map((review) => review.id) } },
    });
    await tx.reviewModeration.deleteMany({
      where: { reviewId: { in: reviews.map((review) => review.id) } },
    });
    await tx.review.deleteMany({ where: { id: { in: reviews.map((review) => review.id) } } });

    const safetyReports = await tx.safetyReport.findMany({
      where: { reporterUserId: clientId, description: { startsWith: "Acceptance " } },
      select: { id: true },
    });
    await tx.safetyReportInternalNote.deleteMany({
      where: { reportId: { in: safetyReports.map((report) => report.id) } },
    });
    await tx.safetyReportAttachment.deleteMany({
      where: { reportId: { in: safetyReports.map((report) => report.id) } },
    });
    await tx.safetyIncidentEvent.deleteMany({
      where: { reportId: { in: safetyReports.map((report) => report.id) } },
    });
    await tx.moderationCase.deleteMany({
      where: {
        sourceType: "SafetyReport",
        sourceId: { in: safetyReports.map((report) => report.id) },
      },
    });
    await tx.safetyReport.deleteMany({
      where: { id: { in: safetyReports.map((report) => report.id) } },
    });

    const shares = await tx.tripShare.findMany({
      where: { ownerUserId: clientId, label: { startsWith: "Acceptance " } },
      select: { id: true },
    });
    await tx.tripShareAccessEvent.deleteMany({
      where: { tripShareId: { in: shares.map((share) => share.id) } },
    });
    await tx.tripShare.deleteMany({ where: { id: { in: shares.map((share) => share.id) } } });

    const supportTickets = await tx.supportTicket.findMany({
      where: { requesterUserId: clientId, subject: { startsWith: "Acceptance " } },
      select: { id: true },
    });
    const supportTicketIds = supportTickets.map((ticket) => ticket.id);
    await tx.ticketAssignment.deleteMany({ where: { ticketId: { in: supportTicketIds } } });
    await tx.ticketInternalNote.deleteMany({ where: { ticketId: { in: supportTicketIds } } });
    await tx.ticketMessage.deleteMany({ where: { ticketId: { in: supportTicketIds } } });
    await tx.supportTicketParticipant.deleteMany({ where: { ticketId: { in: supportTicketIds } } });
    await tx.ticketStatusEvent.deleteMany({ where: { ticketId: { in: supportTicketIds } } });
    await tx.communicationTimelineEvent.deleteMany({
      where: { ticketId: { in: supportTicketIds } },
    });
    await tx.supportTicket.deleteMany({ where: { id: { in: supportTicketIds } } });

    const messages = await tx.chatMessage.findMany({
      where: { clientMessageId: { startsWith: "acceptance-" } },
      select: { id: true },
    });
    await tx.chatMessageReceipt.deleteMany({
      where: { messageId: { in: messages.map((message) => message.id) } },
    });
    await tx.messageReport.deleteMany({
      where: { messageId: { in: messages.map((message) => message.id) } },
    });
    await tx.chatMessage.deleteMany({
      where: { id: { in: messages.map((message) => message.id) } },
    });

    const parcels = await tx.parcelOrder.findMany({
      where: { senderUserId: clientId, title: { startsWith: "Acceptance " } },
      select: { id: true },
    });
    const parcelIds = parcels.map((parcel) => parcel.id);
    await tx.parcelTimelineEvent.deleteMany({ where: { parcelId: { in: parcelIds } } });
    await tx.parcelEvent.deleteMany({ where: { parcelId: { in: parcelIds } } });
    await tx.parcelIssue.deleteMany({ where: { parcelId: { in: parcelIds } } });
    await tx.parcelCancellation.deleteMany({ where: { parcelId: { in: parcelIds } } });
    await tx.parcelHandoverCode.deleteMany({ where: { parcelId: { in: parcelIds } } });
    await tx.parcelPickupCode.deleteMany({ where: { parcelId: { in: parcelIds } } });
    await tx.parcelAttachment.deleteMany({ where: { parcelId: { in: parcelIds } } });
    await tx.parcelOrder.deleteMany({ where: { id: { in: parcelIds } } });

    await tx.paymentRefund.deleteMany({
      where: {
        OR: [
          { idempotencyKey: { startsWith: "acceptance:" } },
          { idempotencyKey: { startsWith: "acceptance-" } },
        ],
      },
    });
    await tx.paymentWebhookEvent.deleteMany({
      where: { eventId: { startsWith: "acceptance-" } },
    });
    const payments = await tx.payment.findMany({
      where: {
        OR: [
          { idempotencyKey: { startsWith: "acceptance:" } },
          { idempotencyKey: { startsWith: "acceptance-" } },
        ],
      },
      select: { id: true },
    });
    const paymentIds = payments.map((payment) => payment.id);
    await tx.paymentAttempt.deleteMany({
      where: { paymentIntent: { paymentId: { in: paymentIds } } },
    });
    await tx.paymentIntent.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await tx.paymentAllocation.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await tx.platformFee.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await tx.driverEarning.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await tx.financialLedgerEntry.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await tx.cashPaymentDeclaration.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await tx.cashSettlement.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });

    const holds = await tx.seatHold.findMany({
      where: { idempotencyKey: { startsWith: "acceptance-" } },
      select: { id: true, bookingId: true },
    });
    const holdIds = holds.map((hold) => hold.id);
    const bookingIds = holds
      .map((hold) => hold.bookingId)
      .filter((id): id is string => Boolean(id));
    await tx.conversationParticipant.deleteMany({
      where: { conversation: { bookingId: { in: bookingIds } } },
    });
    await tx.chatMessageReceipt.deleteMany({
      where: { message: { conversation: { bookingId: { in: bookingIds } } } },
    });
    await tx.messageReport.deleteMany({
      where: { message: { conversation: { bookingId: { in: bookingIds } } } },
    });
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
    await tx.seatHoldItem.deleteMany({ where: { seatHoldId: { in: holdIds } } });
    await tx.seatHold.deleteMany({ where: { id: { in: holdIds } } });
    await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });

    await tx.idempotencyRecord.deleteMany({
      where: {
        OR: [
          { key: { startsWith: "acceptance-" } },
          { key: { startsWith: "acceptance:" } },
          { key: { startsWith: "phase7-" } },
          { scope: { contains: "acceptance" } },
        ],
      },
    });
    await tx.accountRestriction.updateMany({
      where: { userId: driverId, reason: { startsWith: "Acceptance " } },
      data: { status: "REVOKED", removedReason: "acceptance reset" },
    });
    await tx.driverEarning.updateMany({
      where: { driverProfileId: profileId, status: "ON_HOLD" },
      data: { status: "AVAILABLE" },
    });
  });

  await resetBookingOperationFixture();
}

async function seedAcceptanceTrip() {
  const driverId = await driverUserId();
  const profileId = await driverProfileId();
  const vehicle = await prisma.vehicle.findFirstOrThrow({
    where: { driverProfileId: profileId, status: "APPROVED", archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const origin = await prisma.city.findUniqueOrThrow({ where: { code: "nukus" } });
  const destination = await prisma.city.findUniqueOrThrow({ where: { code: "urgench" } });
  const route = await prisma.route.findUniqueOrThrow({
    where: {
      originCityId_destinationCityId: {
        originCityId: origin.id,
        destinationCityId: destination.id,
      },
    },
  });
  const departureAtUtc = new Date("2026-08-13T05:00:00.000Z");
  const trip = await prisma.trip.upsert({
    where: { id: "acceptance-trip-public-1" },
    create: {
      id: "acceptance-trip-public-1",
      driverProfileId: profileId,
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
      comment: "Acceptance deterministic public trip",
      publishedAt: new Date("2026-08-09T00:00:00.000Z"),
      publicationValidationSnapshot: { acceptance: true, errors: [] },
    },
    update: {
      driverProfileId: profileId,
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
      status: "PUBLISHED",
      availableSeatCount: 4,
      passengerSeatCapacity: 4,
      blockedAt: null,
      blockReason: null,
      cancelledAt: null,
      cancellationReason: null,
      parcelSupported: true,
      parcelPriceMinor: 2500000n,
      publishedAt: new Date("2026-08-09T00:00:00.000Z"),
    },
  });
  const seats = [
    ["ROW_1_RIGHT", "Row 1 right", 1, 1],
    ["ROW_2_LEFT", "Row 2 left", 2, 0],
    ["ROW_2_RIGHT", "Row 2 right", 2, 1],
    ["ROW_3_LEFT", "Row 3 left", 3, 0],
  ] as const;
  for (const [seatKey, label, row, column] of seats) {
    await prisma.tripSeat.upsert({
      where: { tripId_seatKey: { tripId: trip.id, seatKey } },
      create: {
        tripId: trip.id,
        seatKey,
        label,
        row,
        column,
        seatType: "STANDARD",
        priceMinor: trip.pricePerSeatMinor,
        status: "AVAILABLE",
      },
      update: { label, row, column, priceMinor: trip.pricePerSeatMinor, status: "AVAILABLE" },
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
    update: { vehicleId: vehicle.id, passengerSeatCapacity: 4, availableSeatCount: 4 },
  });
  const actorUserId = driverId;
  await prisma.tripTimelineEvent.deleteMany({ where: { tripId: trip.id } });
  await prisma.tripTimelineEvent.create({
    data: { tripId: trip.id, type: "ACCEPTANCE_TRIP_READY", payload: { actorUserId } },
  });
}

async function seedAcceptanceState() {
  await resetMutableAcceptanceState();
  await seedAcceptanceTrip();
  const [regions, cities, pickupPoints, routes, trips] = await Promise.all([
    prisma.region.count(),
    prisma.city.count(),
    prisma.pickupPoint.count(),
    prisma.route.count(),
    prisma.trip.count(),
  ]);
  console.log(
    JSON.stringify({
      mode,
      regions,
      cities,
      pickupPoints,
      routes,
      trips,
      reset: true,
    }),
  );
}

requireAcceptanceMode();

seedAcceptanceState()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
