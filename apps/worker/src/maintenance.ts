import type { Prisma, PrismaClient } from "@nodex/database";

type MaintenancePrisma = Pick<PrismaClient, "$transaction" | "payment" | "seatHold">;
type WorkerSeatHoldWithItems = Prisma.SeatHoldGetPayload<{ include: { items: true } }>;

export async function releaseActiveWorkerSeatHold(
  tx: Prisma.TransactionClient,
  hold: WorkerSeatHoldWithItems,
  now: Date,
) {
  const claimed = await tx.seatHold.updateMany({
    where: { id: hold.id, status: "ACTIVE", version: hold.version },
    data: { status: "EXPIRED", releasedAt: now, version: { increment: 1 } },
  });
  if (claimed.count !== 1) return false;

  const tripSeatIds = hold.items
    .map((item) => item.tripSeatId)
    .filter((id): id is string => Boolean(id));
  if (tripSeatIds.length) {
    await tx.tripSeat.updateMany({
      where: { id: { in: tripSeatIds }, status: "HELD" },
      data: { status: "AVAILABLE", version: { increment: 1 } },
    });
  }
  if (hold.bookingId) {
    await tx.bookingSeat.updateMany({
      where: { bookingId: hold.bookingId, tripSeatId: { in: tripSeatIds }, status: "HELD" },
      data: { status: "RELEASED" },
    });
  }
  return true;
}

export async function expireActiveSeatHolds(prisma: MaintenancePrisma, now = new Date()) {
  const holds = await prisma.seatHold.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
    include: { items: true },
    take: 100,
  });
  let expired = 0;
  for (const hold of holds) {
    await prisma.$transaction(async (tx) => {
      const released = await releaseActiveWorkerSeatHold(tx, hold, now);
      if (!released || !hold.bookingId) return;
      expired += 1;
      await tx.booking.update({
        where: { id: hold.bookingId },
        data: { status: "EXPIRED", version: { increment: 1 } },
      });
      await tx.bookingTimelineEvent.create({
        data: {
          bookingId: hold.bookingId,
          type: "BOOKING_HOLD_EXPIRED",
          payload: { worker: true },
        },
      });
      await tx.outboxEvent.create({
        data: { type: "booking.hold.expired", payload: { bookingId: hold.bookingId } },
      });
    });
  }
  return expired;
}

export async function expireStaleOnlinePayments(prisma: MaintenancePrisma, now = new Date()) {
  const staleCutoff = new Date(now.getTime() - 30 * 60 * 1000);
  const stalePayments = await prisma.payment.findMany({
    where: {
      method: "ONLINE",
      status: { in: ["CREATED", "REQUIRES_ACTION", "PROCESSING"] },
      createdAt: { lt: staleCutoff },
    },
    take: 50,
  });
  let expiredPayments = 0;
  for (const payment of stalePayments) {
    await prisma.$transaction(async (tx) => {
      const expired = await tx.payment.updateMany({
        where: {
          id: payment.id,
          method: "ONLINE",
          status: { in: ["CREATED", "REQUIRES_ACTION", "PROCESSING"] },
        },
        data: { status: "EXPIRED", failedAt: now },
      });
      if (expired.count !== 1) return;
      expiredPayments += 1;
      await tx.paymentIntent.updateMany({
        where: {
          paymentId: payment.id,
          status: { in: ["CREATED", "PENDING", "REQUIRES_ACTION", "PROCESSING"] },
        },
        data: { status: "EXPIRED", expiresAt: now },
      });
      if (payment.bookingId) {
        const hold = await tx.seatHold.findFirst({
          where: { bookingId: payment.bookingId, status: "ACTIVE" },
          include: { items: true },
        });
        if (hold) await releaseActiveWorkerSeatHold(tx, hold, now);
        await tx.booking.updateMany({
          where: { id: payment.bookingId, status: "PAYMENT_PENDING" },
          data: { status: "EXPIRED", version: { increment: 1 } },
        });
        await tx.bookingTimelineEvent.create({
          data: {
            bookingId: payment.bookingId,
            type: "PAYMENT_EXPIRED",
            payload: { worker: true, paymentId: payment.id },
          },
        });
      }
      await tx.financialAuditEvent.create({
        data: {
          type: "PAYMENT_EXPIRED",
          entityType: "Payment",
          entityId: payment.id,
          reason: "Stale payment processing timeout",
        },
      });
    });
  }
  return expiredPayments;
}
