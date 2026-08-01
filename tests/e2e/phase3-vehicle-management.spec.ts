import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const api = "http://127.0.0.1:3103/api/v1";

async function mockAuth(request: APIRequestContext, appContext: string) {
  const response = await request.post(`${api}/auth/mock`, { data: { appContext } });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ accessToken: string; roles: string[]; user: { id: string } }>;
}

async function addDocument(request: APIRequestContext, token: string, vehicleId: string) {
  const presign = await request.post(`${api}/vehicles/${vehicleId}/documents/presign`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      type: "REGISTRATION_CERTIFICATE",
      originalFileName: "registration.pdf",
      mimeType: "application/pdf",
      size: 128000,
      checksum: "vehicle-registration-checksum-123456",
    },
  });
  expect(presign.ok()).toBeTruthy();
  const signed = (await presign.json()) as { storageKey: string };
  const complete = await request.post(`${api}/vehicles/${vehicleId}/documents`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      type: "REGISTRATION_CERTIFICATE",
      originalFileName: "registration.pdf",
      mimeType: "application/pdf",
      size: 128000,
      checksum: "vehicle-registration-checksum-123456",
      storageKey: signed.storageKey,
    },
  });
  expect(complete.ok()).toBeTruthy();
}

async function addPhotos(request: APIRequestContext, token: string, vehicleId: string) {
  for (const type of ["FRONT", "REAR", "LEFT_SIDE", "RIGHT_SIDE", "INTERIOR_FRONT", "PLATE"]) {
    const presign = await request.post(`${api}/vehicles/${vehicleId}/photos/presign`, {
      headers: { authorization: `Bearer ${token}` },
      data: {
        type,
        originalFileName: `${type.toLowerCase()}.jpg`,
        mimeType: "image/jpeg",
        size: 128000,
        checksum: `vehicle-photo-${type}-checksum-123456`,
      },
    });
    expect(presign.ok()).toBeTruthy();
    const signed = (await presign.json()) as { storageKey: string };
    const complete = await request.post(`${api}/vehicles/${vehicleId}/photos`, {
      headers: { authorization: `Bearer ${token}` },
      data: {
        type,
        originalFileName: `${type.toLowerCase()}.jpg`,
        mimeType: "image/jpeg",
        size: 128000,
        checksum: `vehicle-photo-${type}-checksum-123456`,
        storageKey: signed.storageKey,
      },
    });
    expect(complete.ok()).toBeTruthy();
  }
}

test.describe("phase 3 vehicle management", () => {
  test("supports vehicle draft, assets, submit, and admin moderation queue", async ({
    request,
  }) => {
    const driver = await mockAuth(request, "DRIVER_APP");
    const created = await request.post(`${api}/vehicles`, {
      headers: { authorization: `Bearer ${driver.accessToken}` },
      data: {
        make: "Chevrolet",
        model: "Onix",
        year: 2024,
        color: "Blue",
        plateNumber: `01T${Date.now().toString().slice(-4)}AA`,
        bodyType: "SEDAN",
        passengerSeatCount: 4,
        luggageCapacity: "2 bags",
        amenities: ["air_conditioning"],
      },
    });
    expect(created.ok()).toBeTruthy();
    const vehicle = await created.json();
    await addDocument(request, driver.accessToken, vehicle.id);
    await addPhotos(request, driver.accessToken, vehicle.id);

    const submitted = await request.post(`${api}/vehicles/${vehicle.id}/submit`, {
      headers: { authorization: `Bearer ${driver.accessToken}` },
    });
    expect(submitted.ok()).toBeTruthy();
    expect((await submitted.json()).status).toBe("SUBMITTED");

    const admin = await mockAuth(request, "ADMIN_WEB");
    const queue = await request.get(`${api}/admin/vehicles?q=${vehicle.plateNumber}`, {
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    expect(queue.ok()).toBeTruthy();
    expect((await queue.json()).vehicles.length).toBeGreaterThan(0);
  });
});
