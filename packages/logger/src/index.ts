import pino from "pino";

export const redactionPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "*.initData",
  "*.jwt",
  "*.token",
  "*.phone",
  "*.documentNumber",
];

export function createLogger(service: string) {
  const options: pino.LoggerOptions = {
    name: service,
    level: process.env.LOG_LEVEL ?? "info",
    redact: { paths: redactionPaths, censor: "[redacted]" },
  };
  if (process.env.NODE_ENV !== "production") options.transport = { target: "pino-pretty" };
  return pino(options);
}
