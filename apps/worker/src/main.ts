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

process.on("SIGTERM", async () => {
  await bookingWorker.close();
  await bookingQueue.close();
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
logger.info({ queueName }, "worker foundation started");
logger.info({ queueName: bookingQueueName }, "worker booking hold expiration started");
