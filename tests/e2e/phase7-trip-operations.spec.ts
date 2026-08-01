import { expect, test, type APIRequestContext } from "@playwright/test";

const client = "http://127.0.0.1:3100";
const api = "http://127.0.0.1:3103/api/v1";

async function mockAuth(request: APIRequestContext, appContext: string) {
  const response = await request.post(`${api}/auth/mock`, { data: { appContext } });
  await expect(response).toBeOK();
  return response.json() as Promise<{ accessToken: string; roles: string[]; user: { id: string } }>;
}

test.describe("phase 7 trip operations", () => {
  test("runs boarding, start, complete, and admin operation visibility", async ({ request }) => {
    const clientAuth = await mockAuth(request, "CLIENT_APP");
    const codeResponse = await request.post(
      `${api}/bookings/phase6-booking-confirmed/boarding-code/regenerate`,
      {
        headers: {
          authorization: `Bearer ${clientAuth.accessToken}`,
          "idempotency-key": "phase7-regenerate-code",
        },
        data: { reason: "Phase 7 E2E code visibility" },
      },
    );
    await expect(codeResponse).toBeOK();
    const codeBody = (await codeResponse.json()) as {
      boardingCode: { code?: string; status: string };
    };
    expect(codeBody.boardingCode.code).toMatch(/^\d{6}$/);

    const driverAuth = await mockAuth(request, "DRIVER_APP");
    const statusBefore = await request.get(
      `${api}/bookings/phase6-booking-confirmed/operation-status`,
      { headers: { authorization: `Bearer ${clientAuth.accessToken}` } },
    );
    await expect(statusBefore).toBeOK();
    const statusBeforeBody = (await statusBefore.json()) as {
      status: { tripId: string; bookingStatus: string };
    };
    expect(statusBeforeBody.status.bookingStatus).toBe("BOARDING");
    const tripId = statusBeforeBody.status.tripId;

    const passengerResponse = await request.get(`${api}/driver/trips/${tripId}/passengers`, {
      headers: { authorization: `Bearer ${driverAuth.accessToken}` },
    });
    await expect(passengerResponse).toBeOK();

    const boardResponse = await request.post(
      `${api}/driver/bookings/phase6-booking-confirmed/board`,
      {
        headers: {
          authorization: `Bearer ${driverAuth.accessToken}`,
          "idempotency-key": "phase7-board-confirmed",
        },
        data: { code: codeBody.boardingCode.code },
      },
    );
    await expect(boardResponse).toBeOK();

    const startResponse = await request.post(`${api}/driver/trips/${tripId}/start`, {
      headers: {
        authorization: `Bearer ${driverAuth.accessToken}`,
        "idempotency-key": "phase7-start-trip",
      },
      data: { allowUnresolvedPassengers: true },
    });
    await expect(startResponse).toBeOK();
    expect((await startResponse.text()).includes("IN_PROGRESS")).toBeTruthy();

    const statusResponse = await request.get(
      `${api}/bookings/phase6-booking-confirmed/operation-status`,
      { headers: { authorization: `Bearer ${clientAuth.accessToken}` } },
    );
    await expect(statusResponse).toBeOK();
    expect((await statusResponse.text()).includes("IN_PROGRESS")).toBeTruthy();

    const completeResponse = await request.post(`${api}/driver/trips/${tripId}/complete`, {
      headers: {
        authorization: `Bearer ${driverAuth.accessToken}`,
        "idempotency-key": "phase7-complete-trip",
      },
      data: { notes: "Phase 7 E2E completion" },
    });
    await expect(completeResponse).toBeOK();
    expect((await completeResponse.text()).includes("COMPLETED")).toBeTruthy();

    const adminAuth = await mockAuth(request, "ADMIN_WEB");
    const operations = await request.get(`${api}/admin/trips/${tripId}/operations`, {
      headers: { authorization: `Bearer ${adminAuth.accessToken}` },
    });
    await expect(operations).toBeOK();
    expect((await operations.text()).includes("TRIP_COMPLETED")).toBeTruthy();
  });

  test("renders operational client, driver, and admin surfaces", async ({ page }) => {
    await page.goto(`${client}/bookings/phase6-booking-confirmed`);
    await expect(page.getByRole("region", { name: "Boarding state" })).toContainText(
      "Boarding code",
    );
    await expect(page.getByRole("region", { name: "Trip operation status" })).toContainText(
      "Completed",
    );

    await page.goto("http://127.0.0.1:3101/passengers-demo");
    await expect(page.getByRole("region", { name: "Driver operation dashboard" })).toContainText(
      "BOARDING",
    );
    await expect(page.getByRole("region", { name: "Boarding code verification" })).toContainText(
      "Confirm boarding",
    );

    await page.goto("http://127.0.0.1:3102/trips");
    await expect(page.getByRole("region", { name: "Trip operation detail" })).toContainText(
      "Driver no-show",
    );
  });
});
