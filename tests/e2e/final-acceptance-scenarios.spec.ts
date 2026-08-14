import { expect, test } from "@playwright/test";
import {
  admin,
  api,
  client,
  createConfirmedBooking,
  driver,
  mockAuth,
  resetAcceptanceState,
  searchableTripId,
  signedMockWebhook,
} from "./final-acceptance-helpers";

test.describe.configure({ mode: "serial" });

test.describe("final acceptance isolated user journeys", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Stateful acceptance journeys run once on desktop.",
    );
    resetAcceptanceState();
  });

  test("A cash passenger ride", async ({ request }) => {
    const { auth, booking } = await createConfirmedBooking(request, {
      idempotencyKey: "acceptance-a-cash-hold",
      paymentMethod: "CASH",
    });
    const payment = await request.post(`${api}/payments/intents`, {
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "idempotency-key": "acceptance:a:cash-payment",
      },
      data: { targetType: "BOOKING", targetId: booking.id, method: "CASH", provider: "MANUAL" },
    });
    expect(payment.status()).toBe(201);
    await expect(
      request.get(`${api}/bookings/${booking.id}`, {
        headers: { authorization: `Bearer ${auth.accessToken}` },
      }),
    ).resolves.toBeOK();
  });

  test("B online mock ride", async ({ request }) => {
    const { auth, booking } = await createConfirmedBooking(request, {
      idempotencyKey: "acceptance-b-online-hold",
      paymentMethod: "ONLINE",
    });
    const payment = await request.post(`${api}/payments/intents`, {
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "idempotency-key": "acceptance:b:online-payment",
      },
      data: { targetType: "BOOKING", targetId: booking.id, method: "ONLINE", provider: "MOCK" },
    });
    expect(payment.status()).toBe(201);
    const paymentBody = (await payment.json()) as {
      payment: { id: string; intents: Array<{ providerReference: string }> };
    };
    const payload = JSON.stringify({
      eventId: "acceptance-b-payment-succeeded",
      providerReference: paymentBody.payment.intents[0]!.providerReference,
      status: "SUCCEEDED",
      amountMinor: booking.totalMinor,
      currency: "UZS",
    });
    const webhook = await request.post(`${api}/payments/mock/webhook`, {
      headers: signedMockWebhook(payload),
      data: payload,
    });
    await expect(webhook).toBeOK();
    const status = await request.get(`${api}/payments/${paymentBody.payment.id}`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    await expect(status).toBeOK();
    expect(await status.text()).toContain("SUCCEEDED");
  });

  test("C failed and expired online payment", async ({ request }) => {
    const { auth, booking } = await createConfirmedBooking(request, {
      idempotencyKey: "acceptance-c-online-hold",
      paymentMethod: "ONLINE",
    });
    const payment = await request.post(`${api}/payments/intents`, {
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "idempotency-key": "acceptance:c:online-payment",
      },
      data: { targetType: "BOOKING", targetId: booking.id, method: "ONLINE", provider: "MOCK" },
    });
    expect(payment.status()).toBe(201);
    const body = (await payment.json()) as {
      payment: { id: string; intents: Array<{ providerReference: string }> };
    };
    const failedPayload = JSON.stringify({
      eventId: "acceptance-c-payment-failed",
      providerReference: body.payment.intents[0]!.providerReference,
      status: "FAILED",
      amountMinor: booking.totalMinor,
      currency: "UZS",
    });
    await expect(
      request.post(`${api}/payments/mock/webhook`, {
        headers: signedMockWebhook(failedPayload),
        data: failedPayload,
      }),
    ).resolves.toBeOK();

    const expiredPayload = JSON.stringify({
      eventId: "acceptance-c-payment-expired",
      providerReference: "acceptance-expired-reference",
      status: "EXPIRED",
      amountMinor: booking.totalMinor,
      currency: "UZS",
    });
    const expired = await request.post(`${api}/payments/mock/webhook`, {
      headers: signedMockWebhook(expiredPayload, Math.floor(Date.now() / 1000) - 1000),
      data: expiredPayload,
    });
    expect(expired.status()).toBe(401);
  });

  test("D refund", async ({ request }) => {
    const { auth, booking } = await createConfirmedBooking(request, {
      idempotencyKey: "acceptance-d-online-hold",
      paymentMethod: "ONLINE",
    });
    const payment = await request.post(`${api}/payments/intents`, {
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "idempotency-key": "acceptance:d:online-payment",
      },
      data: { targetType: "BOOKING", targetId: booking.id, method: "ONLINE", provider: "MOCK" },
    });
    expect(payment.status()).toBe(201);
    const paymentBody = (await payment.json()) as {
      payment: { id: string; intents: Array<{ providerReference: string }> };
    };
    const payload = JSON.stringify({
      eventId: "acceptance-d-payment-succeeded",
      providerReference: paymentBody.payment.intents[0]!.providerReference,
      status: "SUCCEEDED",
      amountMinor: booking.totalMinor,
      currency: "UZS",
    });
    await expect(
      request.post(`${api}/payments/mock/webhook`, {
        headers: signedMockWebhook(payload),
        data: payload,
      }),
    ).resolves.toBeOK();
    const refund = await request.post(`${api}/payments/${paymentBody.payment.id}/refunds`, {
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "idempotency-key": "acceptance:d:refund-request",
      },
      data: {
        paymentId: paymentBody.payment.id,
        reason: "CLIENT_CANCELLATION",
        amountMinor: 1000000,
      },
    });
    expect(refund.status()).toBe(201);
  });

  test("E parcel", async ({ request }) => {
    const auth = await mockAuth(request, "CLIENT_APP");
    const tripId = await searchableTripId(request, "acceptance-e-parcel");
    const created = await request.post(`${api}/parcels`, {
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "idempotency-key": "acceptance-e-parcel-create",
      },
      data: {
        tripId,
        categoryCode: "DOCUMENTS",
        title: "Acceptance parcel documents",
        description: "Acceptance parcel delivery flow",
        weightGrams: 900,
        lengthCm: 25,
        widthCm: 18,
        heightCm: 3,
        declaredValueMinor: 100000,
        senderName: "Acceptance Sender",
        senderPhone: "+998901110001",
        recipientName: "Acceptance Recipient",
        recipientPhone: "+998901110002",
        pickupLabel: "Nukus Central Station",
        destinationLabel: "Urgench Bus Station",
        contentDeclarationAccepted: true,
        packagingDeclarationAccepted: true,
      },
    });
    expect(created.status()).toBe(201);
    const body = (await created.json()) as { parcel: { id: string; priceMinor: string } };
    expect(Number(body.parcel.priceMinor)).toBeGreaterThan(0);
  });

  test("F chat and support", async ({ request }) => {
    const auth = await mockAuth(request, "CLIENT_APP");
    const conversation = await request.post(`${api}/conversations`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
      data: { bookingId: "phase6-booking-confirmed" },
    });
    expect(conversation.status()).toBe(201);
    const conversationBody = (await conversation.json()) as { conversation: { id: string } };
    const message = await request.post(
      `${api}/conversations/${conversationBody.conversation.id}/messages`,
      {
        headers: { authorization: `Bearer ${auth.accessToken}` },
        data: {
          clientMessageId: "acceptance-f-booking-message",
          type: "TEXT",
          text: "Acceptance booking coordination message",
        },
      },
    );
    expect(message.status()).toBe(201);
    const ticket = await request.post(`${api}/support/tickets`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
      data: {
        type: "BOOKING",
        subject: "Acceptance support ticket",
        description: "Acceptance support request",
        priority: "NORMAL",
        bookingId: "phase6-booking-confirmed",
      },
    });
    expect(ticket.status()).toBe(201);
  });

  test("G safety", async ({ request }) => {
    const clientAuth = await mockAuth(request, "CLIENT_APP");
    const driverAuth = await mockAuth(request, "DRIVER_APP");
    const contact = await request.post(`${api}/trusted-contacts`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: {
        displayName: "Acceptance Trusted Contact",
        phone: "+998901119999",
        relationship: "Family",
      },
    });
    expect(contact.status()).toBe(201);
    const report = await request.post(`${api}/safety/reports`, {
      headers: {
        authorization: `Bearer ${clientAuth.accessToken}`,
        "idempotency-key": "acceptance-g-safety-report",
      },
      data: {
        type: "UNSAFE_DRIVING",
        severity: "MEDIUM",
        description: "Acceptance safety report",
        tripId: "phase5-nukus-urgench-morning",
        reportedUserId: driverAuth.user.id,
      },
    });
    expect(report.status()).toBe(201);
  });

  test("H admin finance", async ({ request, page }) => {
    const auth = await mockAuth(request, "ADMIN_WEB");
    const finance = await request.get(`${api}/admin/finance/payments`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    await expect(finance).toBeOK();
    const ledger = await request.get(`${api}/admin/finance/ledger`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    await expect(ledger).toBeOK();
    await page.goto(`${admin}/finance`);
    await expect(page.getByRole("heading", { name: "Finance" })).toBeVisible();
    await page.goto(`${client}/payments`);
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await page.goto(`${driver}/earnings`);
    await expect(page.getByRole("heading", { name: "Driver earnings" })).toBeVisible();
  });
});
