import { expect, test } from "@playwright/test";
import { api, mockAuth, privateFieldNames, searchableTripId } from "./final-acceptance-helpers";

test.describe("final acceptance MinIO and private storage", () => {
  test("verifies health, signed storage flows, and public DTO privacy", async ({ request }) => {
    const minioLive = await request.get("http://127.0.0.1:9000/minio/health/live");
    expect(minioLive.status()).toBe(200);
    const minioReady = await request.get("http://127.0.0.1:9000/minio/health/ready");
    expect(minioReady.status()).toBe(200);

    const driverAuth = await mockAuth(request, "DRIVER_APP");
    const vehicles = await request.get(`${api}/vehicles`, {
      headers: { authorization: `Bearer ${driverAuth.accessToken}` },
    });
    await expect(vehicles).toBeOK();
    const vehicleBody = (await vehicles.json()) as { vehicles: Array<{ id: string }> };
    const vehicleId = vehicleBody.vehicles[0]!.id;

    const vehiclePresign = await request.post(`${api}/vehicles/${vehicleId}/photos/presign`, {
      headers: { authorization: `Bearer ${driverAuth.accessToken}` },
      data: {
        type: "FRONT",
        originalFileName: "acceptance-vehicle.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1000,
      },
    });
    await expect(vehiclePresign).toBeOK();
    const vehicleSigned = (await vehiclePresign.json()) as {
      uploadUrl: string;
      storageKey: string;
    };
    expect(vehicleSigned.uploadUrl).toContain("local-private-upload://");
    expect(vehicleSigned.storageKey).toContain("vehicles/");

    const clientAuth = await mockAuth(request, "CLIENT_APP");
    const tripId = await searchableTripId(request, "acceptance-storage-parcel");
    const parcel = await request.post(`${api}/parcels`, {
      headers: {
        authorization: `Bearer ${clientAuth.accessToken}`,
        "idempotency-key": "acceptance-storage-parcel",
      },
      data: {
        tripId,
        categoryCode: "DOCUMENTS",
        title: "Acceptance storage parcel",
        description: "Acceptance parcel photo flow",
        weightGrams: 500,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 2,
        declaredValueMinor: 100000,
        senderName: "Acceptance Sender",
        recipientName: "Acceptance Receiver",
        recipientPhone: "+998901110003",
        pickupLabel: "Nukus Central Station",
        destinationLabel: "Urgench Bus Station",
        contentDeclarationAccepted: true,
        packagingDeclarationAccepted: true,
      },
    });
    expect(parcel.status()).toBe(201);
    const parcelBody = (await parcel.json()) as { parcel: { id: string } };
    const photo = await request.post(`${api}/parcels/${parcelBody.parcel.id}/photos`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: {
        type: "PACKAGE_BEFORE_HANDOVER",
        originalFileName: "acceptance-parcel.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1000,
        checksum: "acceptance-storage-checksum-0001",
        storageKey: "acceptance/private/parcel-photo.jpg",
      },
    });
    expect(photo.status()).toBe(201);

    const publicTrip = await request.get(`${api}/trips/public/${tripId}`);
    await expect(publicTrip).toBeOK();
    const publicFields = privateFieldNames(await publicTrip.json());
    expect(publicFields).not.toContain("storageKey");
    expect(publicFields).not.toContain("key");

    const expiredLikeRaw = await request.get("http://127.0.0.1:9000/nodex-private/missing-object");
    expect([403, 404]).toContain(expiredLikeRaw.status());
  });
});
