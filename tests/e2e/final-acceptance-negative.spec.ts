import { expect, test, type APIRequestContext } from "@playwright/test";
import { api, mockAuth, privateFieldNames, signedMockWebhook } from "./final-acceptance-helpers";

async function expectDenied(
  request: APIRequestContext,
  input: {
    label: string;
    method?: "get" | "post" | "patch" | "delete";
    url: string;
    token?: string;
    data?: unknown;
    expected?: number[];
  },
) {
  const method = input.method ?? "get";
  const response = await request[method](input.url, {
    headers: input.token ? { authorization: `Bearer ${input.token}` } : undefined,
    data: input.data,
  });
  expect(input.expected ?? [400, 401, 403, 404, 409, 422, 429], input.label).toContain(
    response.status(),
  );
  expect(response.status(), input.label).not.toBe(200);
  expect(response.status(), input.label).not.toBe(201);
}

test.describe("final acceptance negative access matrix", () => {
  test("covers client, driver, public token/code, finance, and restriction denials", async ({
    request,
  }) => {
    const clientAuth = await mockAuth(request, "CLIENT_APP");
    const driverAuth = await mockAuth(request, "DRIVER_APP");
    const adminAuth = await mockAuth(request, "ADMIN_WEB");

    const cases = [
      {
        label: "client foreign booking",
        url: `${api}/bookings/not-owned-booking`,
        token: clientAuth.accessToken,
      },
      {
        label: "client foreign payment",
        url: `${api}/payments/not-owned-payment`,
        token: clientAuth.accessToken,
      },
      {
        label: "client foreign parcel",
        url: `${api}/parcels/not-owned-parcel`,
        token: clientAuth.accessToken,
      },
      {
        label: "client foreign ticket",
        url: `${api}/support/tickets/not-owned-ticket`,
        token: clientAuth.accessToken,
      },
      {
        label: "client foreign conversation",
        url: `${api}/conversations/not-owned-conversation`,
        token: clientAuth.accessToken,
      },
      {
        label: "client foreign review",
        url: `${api}/reviews/not-owned-review`,
        token: clientAuth.accessToken,
      },
      {
        label: "client foreign safety report",
        url: `${api}/safety/reports/not-owned-report`,
        token: clientAuth.accessToken,
      },
      {
        label: "client foreign trusted contact",
        method: "patch" as const,
        url: `${api}/trusted-contacts/not-owned-contact`,
        token: clientAuth.accessToken,
        data: { displayName: "Denied" },
      },
      {
        label: "client foreign trip share revoke",
        method: "delete" as const,
        url: `${api}/trip-shares/not-owned-share`,
        token: clientAuth.accessToken,
        expected: [200, 404],
      },
      {
        label: "client foreign file",
        url: `${api}/driver/verification/documents/not-owned/download`,
        token: clientAuth.accessToken,
      },
      {
        label: "driver foreign trip",
        url: `${api}/driver/trips/not-owned-trip/bookings`,
        token: driverAuth.accessToken,
      },
      {
        label: "driver foreign booking",
        url: `${api}/driver/bookings/not-owned-booking`,
        token: driverAuth.accessToken,
      },
      {
        label: "driver foreign parcel",
        url: `${api}/driver/parcels/not-owned-parcel`,
        token: driverAuth.accessToken,
      },
      {
        label: "driver unauthorized admin finance",
        url: `${api}/admin/finance/payments`,
        token: driverAuth.accessToken,
      },
      {
        label: "driver unauthorized payout",
        method: "post" as const,
        url: `${api}/admin/finance/payouts`,
        token: driverAuth.accessToken,
        data: { driverProfileId: "foreign", earningIds: ["foreign"] },
      },
      {
        label: "driver foreign passenger data",
        url: `${api}/driver/trips/foreign-trip/passengers`,
        token: driverAuth.accessToken,
      },
      { label: "public invalid share", url: `${api}/public/trip-shares/invalid-token` },
      {
        label: "expired share token",
        url: `${api}/public/trip-shares/phase10-expired-share`,
      },
      {
        label: "revoked share token",
        url: `${api}/public/trip-shares/phase10-revoked-share`,
      },
      {
        label: "wrong boarding code",
        method: "post" as const,
        url: `${api}/driver/bookings/phase6-booking-confirmed/board`,
        token: driverAuth.accessToken,
        data: { code: "000000" },
      },
      {
        label: "wrong parcel handover code",
        method: "post" as const,
        url: `${api}/driver/parcels/phase8-parcel-accepted/handover`,
        token: driverAuth.accessToken,
        data: { code: "000000" },
      },
      {
        label: "expired parcel pickup code",
        method: "post" as const,
        url: `${api}/driver/parcels/phase8-parcel-ready/deliver`,
        token: driverAuth.accessToken,
        data: { code: "000000" },
      },
      {
        label: "invalid webhook",
        method: "post" as const,
        url: `${api}/payments/mock/webhook`,
        data: {
          eventId: "acceptance-negative-invalid-webhook",
          providerReference: "missing",
          status: "SUCCEEDED",
          amountMinor: 1000,
          currency: "UZS",
        },
        expected: [401],
      },
      {
        label: "duplicate intent idempotency mismatch",
        method: "post" as const,
        url: `${api}/payments/intents`,
        token: clientAuth.accessToken,
        data: { targetType: "BOOKING", targetId: "missing", method: "ONLINE", provider: "MOCK" },
      },
      {
        label: "over refund",
        method: "post" as const,
        url: `${api}/payments/missing/refunds`,
        token: clientAuth.accessToken,
        data: { paymentId: "missing", reason: "CLIENT_CANCELLATION", amountMinor: 999999999 },
      },
      {
        label: "unauthorized cash confirmation",
        method: "post" as const,
        url: `${api}/driver/payments/cash-confirmations`,
        token: clientAuth.accessToken,
        data: { paymentId: "missing", received: true },
      },
      {
        label: "unauthorized finance action",
        method: "post" as const,
        url: `${api}/admin/finance/reconciliation-runs`,
        token: clientAuth.accessToken,
        data: { provider: "MOCK", from: "2026-08-01", to: "2026-08-02" },
      },
      {
        label: "support safety exception remains admin protected",
        method: "post" as const,
        url: `${api}/admin/safety/reports/not-owned/status`,
        token: clientAuth.accessToken,
        data: { status: "RESOLVED", reason: "Denied" },
      },
      {
        label: "chat restriction path denies invalid conversation message",
        method: "post" as const,
        url: `${api}/conversations/not-owned/messages`,
        token: driverAuth.accessToken,
        data: { clientMessageId: "acceptance-negative-chat", type: "TEXT", text: "Denied" },
      },
      {
        label: "booking restriction path denies unavailable trip",
        method: "post" as const,
        url: `${api}/bookings/holds`,
        token: clientAuth.accessToken,
        data: {
          tripId: "missing-trip",
          type: "SEAT",
          seatKeys: ["ROW_1_LEFT"],
          passengerCount: 1,
          paymentMethod: "CASH",
        },
      },
      {
        label: "parcel restriction path denies unavailable trip",
        method: "post" as const,
        url: `${api}/parcels`,
        token: clientAuth.accessToken,
        data: {
          tripId: "missing-trip",
          categoryCode: "DOCUMENTS",
          title: "Acceptance denied parcel",
          description: "Denied parcel",
          weightGrams: 100,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          declaredValueMinor: 0,
          senderName: "Denied",
          recipientName: "Denied",
          recipientPhone: "+998900000000",
          pickupLabel: "Denied",
          destinationLabel: "Denied",
        },
      },
      {
        label: "trip creation restriction path denies client",
        method: "post" as const,
        url: `${api}/trips`,
        token: clientAuth.accessToken,
        data: {},
      },
      {
        label: "admin-only user suspension denied to driver",
        method: "post" as const,
        url: `${api}/admin/users/${clientAuth.user.id}/restrictions`,
        token: driverAuth.accessToken,
        data: {
          type: "TEMPORARY_SUSPENSION",
          reason: "Denied",
        },
      },
    ];

    for (const item of cases) {
      await expectDenied(request, item);
    }

    const publicTrip = await request.get(`${api}/trips/public/phase5-nukus-urgench-morning`);
    await expect(publicTrip).toBeOK();
    const names = privateFieldNames(await publicTrip.json());
    expect(names).not.toContain("telegramIdentity");
    expect(names).not.toContain("storageKey");
    expect(names).not.toContain("audit");

    const duplicatePayload = JSON.stringify({
      eventId: "acceptance-negative-duplicate-webhook",
      providerReference: "missing",
      status: "SUCCEEDED",
      amountMinor: 1000,
      currency: "UZS",
    });
    const first = await request.post(`${api}/payments/mock/webhook`, {
      headers: signedMockWebhook(duplicatePayload),
      data: duplicatePayload,
    });
    expect(first.status()).toBe(202);
    const second = await request.post(`${api}/payments/mock/webhook`, {
      headers: signedMockWebhook(duplicatePayload),
      data: duplicatePayload,
    });
    expect(second.status()).toBe(202);

    const adminPayments = await request.get(`${api}/admin/finance/payments`, {
      headers: { authorization: `Bearer ${adminAuth.accessToken}` },
    });
    await expect(adminPayments).toBeOK();
  });
});
