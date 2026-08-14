import type { TestInfo } from "@playwright/test";

const dayMs = 24 * 60 * 60 * 1000;
const runOffset = Number(process.env.GITHUB_RUN_ID ?? Date.now()) % 70_000;

export function futureTripSearchDate(offsetDays = 7) {
  const date = new Date(Date.now() + offsetDays * dayMs);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export function projectScopedTelegramId(base: number, testInfo: TestInfo) {
  const projectOffset = testInfo.project.name === "mobile" ? 1_000 : 0;
  return base + runOffset * 10 + projectOffset + testInfo.retry;
}

export function phase7BookingId(testInfo: TestInfo) {
  return `phase7-booking-confirmed-${testInfo.retry}`;
}

export function runScopedId(prefix: string, testInfo: TestInfo) {
  return `${prefix}-${testInfo.project.name}-${runOffset}-${testInfo.retry}`;
}
