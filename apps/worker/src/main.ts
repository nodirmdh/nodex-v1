import { Queue, Worker } from "bullmq";
import { PrismaClient } from "@nodex/database";
import pino from "pino";

const loggerOptions: pino.LoggerOptions = {
  name: "nodex-worker",
};
if (process.env.NODE_ENV !== "production") loggerOptions.transport = { target: "pino-pretty" };
const logger = pino(loggerOptions);
const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  maxRetriesPerRequest: null,
};
const prisma = new PrismaClient();
const queueName = "nodex.foundation.test";
const bookingQueueName = "nodex.booking.hold-expiration";
const operationsQueueName = "nodex.trip.operations";
const communicationQueueName = "nodex.communication.delivery";
const trustSafetyQueueName = "nodex.trust-safety.maintenance";
const queue = new Queue(queueName, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});
const bookingQueue = new Queue(bookingQueueName, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});
const operationsQueue = new Queue(operationsQueueName, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});
const communicationQueue = new Queue(communicationQueueName, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});
const trustSafetyQueue = new Queue(trustSafetyQueueName, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

const worker = new Worker(
  queueName,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, "processed foundation job");
    return { ok: true };
  },
  { connection, concurrency: 4 },
);

const bookingWorker = new Worker(
  bookingQueueName,
  async () => {
    const now = new Date();
    const holds = await prisma.seatHold.findMany({
      where: { status: "ACTIVE", expiresAt: { lte: now } },
      include: { items: true },
      take: 100,
    });
    for (const hold of holds) {
      await prisma.$transaction(async (tx) => {
        await tx.tripSeat.updateMany({
          where: {
            tripId: hold.tripId,
            seatKey: { in: hold.items.map((item) => item.seatKey) },
            status: "HELD",
          },
          data: { status: "AVAILABLE", version: { increment: 1 } },
        });
        await tx.bookingSeat.updateMany({
          where: { bookingId: hold.bookingId ?? "", status: "HELD" },
          data: { status: "RELEASED" },
        });
        await tx.seatHold.update({
          where: { id: hold.id },
          data: { status: "EXPIRED", releasedAt: now, version: { increment: 1 } },
        });
        if (hold.bookingId) {
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
        }
      });
    }
    logger.info({ expired: holds.length }, "processed booking hold expiration job");
    return { expired: holds.length };
  },
  { connection, concurrency: 1 },
);

const operationsWorker = new Worker(
  operationsQueueName,
  async () => {
    const now = new Date();
    const expiredCodes = await prisma.boardingCode.updateMany({
      where: { status: "ACTIVE", expiresAt: { lte: now }, verifiedAt: null },
      data: { status: "EXPIRED" },
    });
    const expiredHandoverCodes = await prisma.parcelHandoverCode.updateMany({
      where: { status: "ACTIVE", expiresAt: { lte: now }, verifiedAt: null },
      data: { status: "EXPIRED" },
    });
    const expiredPickupCodes = await prisma.parcelPickupCode.updateMany({
      where: { status: "ACTIVE", expiresAt: { lte: now }, verifiedAt: null },
      data: { status: "EXPIRED" },
    });
    const expiredDraftParcels = await prisma.parcelOrder.updateMany({
      where: {
        status: { in: ["DRAFT", "CREATED"] },
        createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      data: { status: "EXPIRED", version: { increment: 1 } },
    });
    const staleAcceptedParcels = await prisma.parcelOrder.updateMany({
      where: {
        status: "ACCEPTED",
        trip: { departureAtUtc: { lt: now } },
      },
      data: { status: "EXPIRED", version: { increment: 1 } },
    });
    const staleTrips = await prisma.trip.findMany({
      where: {
        status: { in: ["PUBLISHED", "BOOKING_OPEN"] },
        departureAtUtc: { lt: new Date(now.getTime() - 6 * 60 * 60 * 1000) },
      },
      take: 50,
    });
    for (const trip of staleTrips) {
      await prisma.$transaction(async (tx) => {
        await tx.trip.update({
          where: { id: trip.id },
          data: { status: "EXPIRED", version: { increment: 1 } },
        });
        await tx.tripOperationEvent.create({
          data: { tripId: trip.id, type: "TRIP_AUTO_EXPIRED", payload: { worker: true } },
        });
        await tx.tripTimelineEvent.create({
          data: { tripId: trip.id, type: "TRIP_AUTO_EXPIRED", payload: { worker: true } },
        });
        await tx.outboxEvent.create({
          data: { type: "trip.expired", payload: { tripId: trip.id, worker: true } },
        });
      });
    }
    logger.info(
      {
        expiredCodes: expiredCodes.count,
        expiredHandoverCodes: expiredHandoverCodes.count,
        expiredPickupCodes: expiredPickupCodes.count,
        expiredDraftParcels: expiredDraftParcels.count,
        staleAcceptedParcels: staleAcceptedParcels.count,
        staleTrips: staleTrips.length,
      },
      "processed trip operations job",
    );
    return {
      expiredCodes: expiredCodes.count,
      expiredHandoverCodes: expiredHandoverCodes.count,
      expiredPickupCodes: expiredPickupCodes.count,
      expiredDraftParcels: expiredDraftParcels.count,
      staleAcceptedParcels: staleAcceptedParcels.count,
      staleTrips: staleTrips.length,
    };
  },
  { connection, concurrency: 1 },
);

const communicationWorker = new Worker(
  communicationQueueName,
  async () => {
    const now = new Date();
    const deliveries = await prisma.notificationDelivery.findMany({
      where: { status: { in: ["PENDING", "RETRYING"] } },
      include: { notification: true },
      take: 100,
      orderBy: { createdAt: "asc" },
    });
    for (const delivery of deliveries) {
      const providerMessageId =
        delivery.channel === "TELEGRAM" ? `telegram-dev:${delivery.id}` : `in-app:${delivery.id}`;
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "DELIVERED",
          deliveredAt: now,
          providerMessageId,
          attemptCount: { increment: 1 },
        },
      });
      await prisma.outboxEvent.create({
        data: {
          type: "notification.delivery.completed",
          payload: {
            notificationId: delivery.notificationId,
            deliveryId: delivery.id,
            channel: delivery.channel,
            providerMessageId,
          },
        },
      });
    }

    const overdueTickets = await prisma.supportTicket.findMany({
      where: {
        slaDueAt: { lte: now },
        status: { notIn: ["RESOLVED", "CLOSED", "REJECTED"] },
      },
      select: { id: true, status: true, slaDueAt: true },
      take: 50,
    });
    for (const ticket of overdueTickets) {
      await prisma.communicationTimelineEvent.create({
        data: {
          ticketId: ticket.id,
          type: "SUPPORT_SLA_OVERDUE",
          payload: { status: ticket.status, slaDueAt: ticket.slaDueAt?.toISOString() ?? null },
        },
      });
    }

    logger.info(
      { delivered: deliveries.length, overdueTickets: overdueTickets.length },
      "processed communication delivery job",
    );
    return { delivered: deliveries.length, overdueTickets: overdueTickets.length };
  },
  { connection, concurrency: 1 },
);

const trustSafetyWorker = new Worker(
  trustSafetyQueueName,
  async () => {
    const now = new Date();
    const expiredRestrictions = await prisma.accountRestriction.findMany({
      where: { status: "ACTIVE", endsAt: { lte: now } },
      take: 100,
    });
    for (const restriction of expiredRestrictions) {
      await prisma.$transaction(async (tx) => {
        await tx.accountRestriction.update({
          where: { id: restriction.id },
          data: { status: "EXPIRED" },
        });
        await tx.accountRestrictionEvent.create({
          data: {
            restrictionId: restriction.id,
            actorUserId: restriction.createdByUserId,
            type: "ACCOUNT_RESTRICTION_EXPIRED",
            payload: { worker: true },
          },
        });
        await tx.reliabilityEvent.create({
          data: {
            userId: restriction.userId,
            type: "RESTRICTION_REMOVED",
            restrictionId: restriction.id,
            dedupeKey: `restriction:${restriction.id}:expired`,
          },
        });
        await tx.outboxEvent.create({
          data: {
            type: "account.restriction.expired",
            payload: { userId: restriction.userId, restrictionId: restriction.id },
          },
        });
      });
    }

    const ratingRows = await prisma.review.groupBy({
      by: ["revieweeUserId", "type"],
      where: { status: "PUBLISHED" },
      _count: { _all: true },
      _avg: { overallRating: true },
    });
    for (const row of ratingRows) {
      const count = row._count._all;
      const average = Number((row._avg.overallRating ?? 0).toFixed(2));
      await prisma.ratingAggregate.upsert({
        where: { userId_scope: { userId: row.revieweeUserId, scope: row.type } },
        create: {
          userId: row.revieweeUserId,
          scope: row.type,
          ratingCount: count,
          averageRating: average,
          ratingDistribution: {},
          lastCalculatedAt: now,
        },
        update: {
          ratingCount: count,
          averageRating: average,
          lastCalculatedAt: now,
          version: { increment: 1 },
        },
      });
    }

    const eventRows = await prisma.reliabilityEvent.groupBy({
      by: ["userId"],
      _count: { _all: true },
    });
    for (const row of eventRows) {
      const restrictionCount = await prisma.accountRestriction.count({
        where: { userId: row.userId, status: "ACTIVE" },
      });
      const level =
        restrictionCount > 0 ? "RESTRICTED" : row._count._all >= 5 ? "AT_RISK" : "STANDARD";
      await prisma.reliabilityProfile.upsert({
        where: { userId: row.userId },
        create: {
          userId: row.userId,
          reliabilityLevel: level,
          accountRestrictionCount: restrictionCount,
        },
        update: {
          reliabilityLevel: level,
          accountRestrictionCount: restrictionCount,
          lastCalculatedAt: now,
          version: { increment: 1 },
        },
      });
    }

    logger.info(
      {
        expiredRestrictions: expiredRestrictions.length,
        ratingRows: ratingRows.length,
        profiles: eventRows.length,
      },
      "processed trust safety maintenance job",
    );
    return {
      expiredRestrictions: expiredRestrictions.length,
      ratingRows: ratingRows.length,
      profiles: eventRows.length,
    };
  },
  { connection, concurrency: 1 },
);

process.on("SIGTERM", async () => {
  await trustSafetyWorker.close();
  await trustSafetyQueue.close();
  await communicationWorker.close();
  await communicationQueue.close();
  await bookingWorker.close();
  await bookingQueue.close();
  await operationsWorker.close();
  await operationsQueue.close();
  await worker.close();
  await queue.close();
  await prisma.$disconnect();
});

await queue.add("health", { createdAt: new Date().toISOString() }, { jobId: "foundation-health" });
await bookingQueue.add(
  "expire-holds",
  { createdAt: new Date().toISOString() },
  { jobId: "booking-hold-expiration-health", repeat: { every: 60_000 } },
);
await operationsQueue.add(
  "expire-operations",
  { createdAt: new Date().toISOString() },
  { jobId: "trip-operations-health", repeat: { every: 60_000 } },
);
await communicationQueue.add(
  "deliver-notifications",
  { createdAt: new Date().toISOString() },
  { jobId: "communication-delivery-health", repeat: { every: 60_000 } },
);
await trustSafetyQueue.add(
  "trust-safety-maintenance",
  { createdAt: new Date().toISOString() },
  { jobId: "trust-safety-maintenance-health", repeat: { every: 60_000 } },
);
logger.info({ queueName }, "worker foundation started");
logger.info({ queueName: bookingQueueName }, "worker booking hold expiration started");
logger.info({ queueName: operationsQueueName }, "worker trip operations started");
logger.info({ queueName: communicationQueueName }, "worker communication delivery started");
logger.info({ queueName: trustSafetyQueueName }, "worker trust safety maintenance started");
