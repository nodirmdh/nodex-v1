import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { expect, type APIRequestContext } from "@playwright/test";

export const client = "http://127.0.0.1:3100";
export const driver = "http://127.0.0.1:3101";
export const admin = "http://127.0.0.1:3102";
export const api = "http://127.0.0.1:3103/api/v1";

export type AuthBody = {
  accessToken: string;
  roles: string[];
  user: { id: string };
};

export function resetAcceptanceState() {
  const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "pnpm acceptance:reset"]
      : ["acceptance:reset"];
  execFileSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ACCEPTANCE_MODE: "true", NODE_ENV: "development" },
    stdio: "pipe",
  });
}

export async function mockAuth(request: APIRequestContext, appContext: string) {
  const response = await request.post(`${api}/auth/mock`, { data: { appContext } });
  await expect(response).toBeOK();
  return response.json() as Promise<AuthBody>;
}

export async function cityIds(request: APIRequestContext) {
  const response = await request.get(`${api}/cities`);
  await expect(response).toBeOK();
  const body = (await response.json()) as {
    cities: Array<{ id: string; code: string }>;
  };
  const nukus = body.cities.find((city) => city.code === "nukus")?.id;
  const urgench = body.cities.find((city) => city.code === "urgench")?.id;
  const khiva = body.cities.find((city) => city.code === "khiva")?.id;
  expect(nukus).toBeTruthy();
  expect(urgench).toBeTruthy();
  expect(khiva).toBeTruthy();
  return { nukus: nukus!, urgench: urgench!, khiva: khiva! };
}

export async function searchableTripId(request: APIRequestContext, sessionId: string) {
  const ids = await cityIds(request);
  const response = await request.get(`${api}/trips/search`, {
    params: {
      originCityId: ids.nukus,
      destinationCityId: ids.urgench,
      date: "2026-08-13",
      passengers: "1",
      sessionId,
    },
  });
  await expect(response).toBeOK();
  const body = (await response.json()) as { trips: Array<{ id: string }> };
  expect(body.trips[0]?.id).toBeTruthy();
  return body.trips[0]!.id;
}

export async function availableSeat(request: APIRequestContext, tripId: string) {
  const seats = await request.get(`${api}/trips/public/${tripId}/seats`);
  await expect(seats).toBeOK();
  const body = (await seats.json()) as {
    seats: Array<{ seatKey: string; status: string }>;
  };
  const seat = body.seats.find((item) => item.status === "AVAILABLE");
  expect(seat?.seatKey).toBeTruthy();
  return seat!.seatKey;
}

export async function createConfirmedBooking(
  request: APIRequestContext,
  input: { idempotencyKey: string; paymentMethod: "CASH" | "ONLINE" | "MANUAL_TRANSFER" },
) {
  const auth = await mockAuth(request, "CLIENT_APP");
  const tripId = await searchableTripId(request, input.idempotencyKey);
  const seatKey = await availableSeat(request, tripId);
  const bookingPaymentMethod =
    input.paymentMethod === "ONLINE" ? "MANUAL_TRANSFER" : input.paymentMethod;
  const hold = await request.post(`${api}/bookings/holds`, {
    headers: {
      authorization: `Bearer ${auth.accessToken}`,
      "idempotency-key": input.idempotencyKey,
    },
    data: {
      tripId,
      type: "SEAT",
      seatKeys: [seatKey],
      passengerCount: 1,
      paymentMethod: bookingPaymentMethod,
    },
  });
  expect(hold.status()).toBe(201);
  const holdBody = (await hold.json()) as { hold: { id: string } };
  const confirm = await request.post(`${api}/bookings/holds/${holdBody.hold.id}/confirm`, {
    headers: { authorization: `Bearer ${auth.accessToken}` },
    data: {
      passengers: [{ firstName: "Acceptance", lastName: "Passenger", ageCategory: "ADULT" }],
      baggage: [{ type: "SUITCASE", quantity: 1, weightKg: 8 }],
      paymentMethod: bookingPaymentMethod,
      consentAccepted: true,
    },
  });
  await expect(confirm).toBeOK();
  const body = (await confirm.json()) as {
    booking: { id: string; tripId: string; status: string; totalMinor: string };
  };
  expect(body.booking.status).toBe("CONFIRMED");
  return { auth, booking: body.booking };
}

export function signedMockWebhook(rawBody: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", "local-mock-secret")
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return {
    "content-type": "application/json",
    "x-nodex-mock-timestamp": String(timestamp),
    "x-nodex-mock-signature": signature,
  };
}

export function privateFieldNames(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(privateFieldNames);
  return Object.entries(value).flatMap(([key, item]) => [key, ...privateFieldNames(item)]);
}
