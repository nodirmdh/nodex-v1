import { expect, test, type APIRequestContext } from "@playwright/test";

const client = "http://127.0.0.1:3100";
const driver = "http://127.0.0.1:3101";
const admin = "http://127.0.0.1:3102";
const api = "http://127.0.0.1:3103/api/v1";

async function mockAuth(request: APIRequestContext, appContext: string) {
  const response = await request.post(`${api}/auth/mock`, { data: { appContext } });
  await expect(response).toBeOK();
  return response.json() as Promise<{ accessToken: string; roles: string[]; user: { id: string } }>;
}

test.describe("phase 10 reviews, reliability, and safety", () => {
  test("creates reviews, aggregates rating, and supports reporting", async ({ request }) => {
    const clientAuth = await mockAuth(request, "CLIENT_APP");
    const driverAuth = await mockAuth(request, "DRIVER_APP");

    const eligibility = await request.get(`${api}/reviews/eligibility`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      params: {
        type: "PARCEL_DRIVER_BY_SENDER",
        parcelOrderId: "phase8-parcel-delivered",
        revieweeUserId: driverAuth.user.id,
      },
    });
    await expect(eligibility).toBeOK();
    await expect(await eligibility.text()).toContain("ok");

    const review = await request.post(`${api}/reviews`, {
      headers: {
        authorization: `Bearer ${clientAuth.accessToken}`,
        "Idempotency-Key": `phase10-review-${Date.now()}`,
      },
      data: {
        type: "PARCEL_DRIVER_BY_SENDER",
        parcelOrderId: "phase8-parcel-delivered",
        revieweeUserId: driverAuth.user.id,
        overallRating: 5,
        text: "Reliable delivery with clear communication.",
        criteria: [{ code: "CAREFUL_HANDLING", score: 5 }],
      },
    });
    expect(review.status()).toBe(201);
    const reviewBody = (await review.json()) as { review: { id: string; overallRating: number } };
    expect(reviewBody.review.overallRating).toBe(5);

    const summary = await request.get(`${api}/users/${driverAuth.user.id}/rating-summary`);
    await expect(summary).toBeOK();
    await expect(await summary.text()).toContain("averageRating");

    const report = await request.post(`${api}/reviews/${reviewBody.review.id}/report`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: { reason: "Smoke moderation report" },
    });
    expect(report.status()).toBe(201);
  });

  test("records safety reports, blocks, contacts, trip shares, and emergency actions", async ({
    request,
  }) => {
    const clientAuth = await mockAuth(request, "CLIENT_APP");
    const driverAuth = await mockAuth(request, "DRIVER_APP");

    const block = await request.post(`${api}/users/${driverAuth.user.id}/block`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: { reason: "Do not match in future smoke runs" },
    });
    expect(block.status()).toBe(201);

    const blocks = await request.get(`${api}/blocks/mine`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
    });
    await expect(blocks).toBeOK();
    await expect(await blocks.text()).toContain(driverAuth.user.id);

    const contact = await request.post(`${api}/trusted-contacts`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: {
        displayName: `Smoke Contact ${Date.now()}`,
        phone: `+99890${String(Date.now()).slice(-7)}`,
        relationship: "Family",
      },
    });
    expect(contact.status()).toBe(201);

    const booking = await request.get(`${api}/bookings/phase6-booking-confirmed`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
    });
    await expect(booking).toBeOK();
    const bookingBody = (await booking.json()) as { booking: { tripId: string } };

    const safetyReport = await request.post(`${api}/safety/reports`, {
      headers: {
        authorization: `Bearer ${clientAuth.accessToken}`,
        "Idempotency-Key": `phase10-safety-${Date.now()}`,
      },
      data: {
        type: "UNSAFE_DRIVING",
        severity: "MEDIUM",
        description: "Smoke safety report for trust and safety workflow.",
        tripId: bookingBody.booking.tripId,
        reportedUserId: driverAuth.user.id,
      },
    });
    expect(safetyReport.status()).toBe(201);
    const reportBody = (await safetyReport.json()) as { report: { id: string } };

    const emergency = await request.post(`${api}/emergency/actions`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: {
        type: "SOS_STARTED",
        tripId: bookingBody.booking.tripId,
        safetyReportId: reportBody.report.id,
        metadata: { source: "phase10-smoke" },
      },
    });
    expect(emergency.status()).toBe(201);

    const share = await request.post(`${api}/trips/${bookingBody.booking.tripId}/shares`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: { bookingId: "phase6-booking-confirmed", label: "Smoke share" },
    });
    expect([200, 201]).toContain(share.status());
  });

  test("exposes admin trust and safety moderation workspace", async ({ request }) => {
    const adminAuth = await mockAuth(request, "ADMIN_WEB");
    const reports = await request.get(`${api}/admin/safety/reports`, {
      headers: { authorization: `Bearer ${adminAuth.accessToken}` },
    });
    await expect(reports).toBeOK();
    await expect(await reports.text()).toContain("severity");

    const queue = await request.get(`${api}/admin/moderation/queue`, {
      headers: { authorization: `Bearer ${adminAuth.accessToken}` },
    });
    await expect(queue).toBeOK();
    await expect(await queue.text()).toContain("cases");
  });

  test("renders client, driver, and admin trust and safety surfaces", async ({ page }) => {
    await page.goto(`${client}/reviews`);
    await expect(page.getByRole("heading", { name: "Reviews", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review Azizbek" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit review" })).toBeVisible();

    await page.goto(`${client}/safety`);
    await expect(page.getByRole("heading", { name: "Safety", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Current trip protection" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Share trip" })).toBeVisible();
    await expect(page.getByRole("link", { name: "SOS" })).toBeVisible();
    await expect(page.getByText("Trusted contact")).toBeVisible();

    await page.goto(`${client}/safety/sos`);
    await expect(page.getByRole("heading", { name: "Emergency help" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Hold to start SOS" })).toBeVisible();

    await page.goto(`${driver}/reviews`);
    await expect(page.getByRole("heading", { name: "Reliability profile" })).toBeVisible();
    await expect(page.getByRole("button", { name: "View received reviews" })).toBeVisible();

    await page.goto(`${driver}/safety`);
    await expect(page.getByRole("heading", { name: "Driver safety center" })).toBeVisible();

    await page.goto(`${admin}/trust-safety`);
    await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Review moderation queue" })).toContainText(
      "Flagged",
    );

    await page.goto(`${admin}/trust-safety?view=safety`);
    await expect(page.getByRole("heading", { name: "Safety" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Safety case queue" })).toContainText("SAF-441");
    await expect(page.getByRole("region", { name: "Safety case detail" })).toContainText(
      "Contact support flow",
    );
  });
});
