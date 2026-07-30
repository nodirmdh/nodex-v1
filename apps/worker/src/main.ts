import { Queue, Worker } from "bullmq";
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
const queueName = "nodex.foundation.test";
const queue = new Queue(queueName, {
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

process.on("SIGTERM", async () => {
  await worker.close();
  await queue.close();
});

await queue.add("health", { createdAt: new Date().toISOString() }, { jobId: "foundation-health" });
logger.info({ queueName }, "worker foundation started");
