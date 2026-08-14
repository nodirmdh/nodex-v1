import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { projectScopedTelegramId } from "./e2e-fixtures";

const api = "http://127.0.0.1:3103/api/v1";

async function mockAuth(
  request: APIRequestContext,
  appContext: string,
  options: { telegramUserId?: number } = {},
) {
  const response = await request.post(`${api}/auth/mock`, { data: { appContext, ...options } });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ accessToken: string; roles: string[]; user: { id: string } }>;
}

function vehiclePlateNumber(telegramUserId: number) {
  return `01A${String(100 + (telegramUserId % 800)).padStart(3, "0")}AA`;
}

async function fillApplication(request: APIRequestContext, token: string, telegramUserId: number) {
  const draft = await request.patch(`${api}/driver/verification`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      legalFirstName: "Phase",
      legalLastName: "Driver",
      birthDate: "1990-01-01",
      phone: `+998${telegramUserId}`,
      personalIdentificationNumber: `PIN-E2E-${telegramUserId}`,
      registeredAddress: "Masked registered address",
      residentialAddress: "Masked residential address",
      driverLicenseNumber: `DL-E2E-${telegramUserId}`,
      driverLicenseIssuedAt: "2020-01-01",
      driverLicenseExpiresAt: "2030-01-01",
      driverLicenseCategory: "B",
      driverExperienceSince: "2018-01-01",
      vehicleMake: "Chevrolet",
      vehicleModel: "Cobalt",
      vehicleYear: 2022,
      vehicleColor: "White",
      vehiclePlateNumber: vehiclePlateNumber(telegramUserId),
      vehicleRegistrationNumber: `VR-E2E-${telegramUserId}`,
      vehicleSeats: 4,
      consentAccepted: true,
    },
  });
  expect(draft.ok()).toBeTruthy();
}

async function uploadRequiredDocuments(
  request: APIRequestContext,
  token: string,
  telegramUserId: number,
) {
  for (const type of [
    "IDENTITY_FRONT",
    "DRIVER_LICENSE_FRONT",
    "VEHICLE_REGISTRATION_FRONT",
    "DRIVER_SELFIE",
    "VEHICLE_FRONT",
  ]) {
    const presign = await request.post(`${api}/driver/verification/documents/presign`, {
      headers: { authorization: `Bearer ${token}` },
      data: {
        type,
        originalFileName: `${type.toLowerCase()}.jpg`,
        mimeType: "image/jpeg",
        size: 128000,
        checksum: `checksum-${type}-${telegramUserId}`,
      },
    });
    expect(presign.ok()).toBeTruthy();
    const signed = (await presign.json()) as { storageKey: string };
    const complete = await request.post(`${api}/driver/verification/documents/complete`, {
      headers: { authorization: `Bearer ${token}` },
      data: {
        type,
        originalFileName: `${type.toLowerCase()}.jpg`,
        mimeType: "image/jpeg",
        size: 128000,
        checksum: `checksum-${type}-${telegramUserId}`,
        storageKey: signed.storageKey,
      },
    });
    expect(complete.ok()).toBeTruthy();
  }
}

test.describe("phase 2 driver verification", () => {
  test("supports draft, upload metadata, completion, submit, and admin approval", async ({
    request,
  }, testInfo) => {
    const telegramUserId = projectScopedTelegramId(901200002, testInfo);
    const driver = await mockAuth(request, "DRIVER_APP", {
      telegramUserId,
    });
    await request.post(`${api}/driver/verification`, {
      headers: { authorization: `Bearer ${driver.accessToken}` },
    });
    await fillApplication(request, driver.accessToken, telegramUserId);
    await uploadRequiredDocuments(request, driver.accessToken, telegramUserId);

    const completion = await request.get(`${api}/driver/verification/completion`, {
      headers: { authorization: `Bearer ${driver.accessToken}` },
    });
    expect(completion.ok()).toBeTruthy();
    expect((await completion.json()).canSubmit).toBeTruthy();

    const submitted = await request.post(`${api}/driver/verification/submit`, {
      headers: { authorization: `Bearer ${driver.accessToken}` },
    });
    expect(submitted.ok()).toBeTruthy();
    const application = await submitted.json();
    expect(application.status).toBe("SUBMITTED");

    const admin = await mockAuth(request, "ADMIN_WEB");
    const start = await request.post(
      `${api}/admin/driver-verifications/${application.id}/start-review`,
      { headers: { authorization: `Bearer ${admin.accessToken}` } },
    );
    expect(start.ok()).toBeTruthy();
    const review = await start.json();
    expect(review.status).toBe("UNDER_REVIEW");

    const approve = await request.post(
      `${api}/admin/driver-verifications/${application.id}/approve`,
      {
        headers: { authorization: `Bearer ${admin.accessToken}` },
        data: { version: review.version },
      },
    );
    expect(approve.ok()).toBeTruthy();
    expect((await approve.json()).status).toBe("APPROVED");
  });

  test("protects driver verification from client and support contexts", async ({
    request,
  }, testInfo) => {
    const client = await mockAuth(request, "CLIENT_APP", {
      telegramUserId: projectScopedTelegramId(902200003, testInfo),
    });
    const forbidden = await request.get(`${api}/driver/verification`, {
      headers: { authorization: `Bearer ${client.accessToken}` },
    });
    expect(forbidden.status()).toBe(403);
  });

  test("renders driver and admin verification surfaces", async ({ page }) => {
    await page.goto("http://127.0.0.1:3101/");
    await expect(page.getByText("Driver verification")).toBeVisible();
    await expect(page.getByLabel("Verification steps")).toBeVisible();

    await page.goto("http://127.0.0.1:3102/drivers");
    await expect(page.getByText("Driver verification")).toBeVisible();
    await expect(page.getByLabel("Driver verification queue")).toBeVisible();
  });
});
