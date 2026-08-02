import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roles = ["CLIENT", "DRIVER", "ADMIN", "SUPPORT"];
const permissions = [
  "trip:create",
  "trip:read",
  "booking:create",
  "driver-application:review",
  "payment:manual-confirm",
  "audit:read",
  "support-ticket:add-internal-note",
  "driver.verification.readOwn",
  "driver.verification.updateOwn",
  "driver.verification.submitOwn",
  "driver.verification.withdrawOwn",
  "driver.document.uploadOwn",
  "driver.document.readOwn",
  "admin.driverVerification.list",
  "admin.driverVerification.read",
  "admin.driverVerification.review",
  "admin.driverVerification.approve",
  "admin.driverVerification.reject",
  "admin.driverVerification.requestChanges",
  "admin.driverVerification.suspend",
  "admin.driverDocument.read",
  "vehicle:create-own",
  "vehicle:read-own",
  "vehicle:update-own",
  "vehicle:submit-own",
  "vehicle:set-primary-own",
  "vehicle:archive-own",
  "vehicle:review",
  "vehicle:approve",
  "vehicle:reject",
  "vehicle:request-changes",
  "vehicle:suspend",
  "vehicle:restore",
  "vehicle:read-admin",
  "vehicle:audit-read",
  "region:read",
  "region:manage",
  "city:read",
  "city:manage",
  "pickup-point:read",
  "pickup-point:manage",
  "route:read",
  "route:manage",
  "trip:create-own",
  "trip:read-own",
  "trip:update-own-draft",
  "trip:publish-own",
  "trip:unpublish-own",
  "trip:cancel-own",
  "trip:start-boarding-own",
  "trip:start-own",
  "trip:complete-own",
  "trip:cancel-operational-own",
  "trip:operations-read-own",
  "trip:read-admin",
  "trip:block",
  "trip:unblock",
  "trip:cancel-admin",
  "trip:operations-read-admin",
  "trip:cancel-operational-admin",
  "trip:no-show-driver-admin",
  "trip:force-transition-admin",
  "trip:audit-read",
  "booking:create-own",
  "booking:read-own",
  "booking:cancel-own",
  "booking:boarding-code-read-own",
  "booking:boarding-code-regenerate-own",
  "booking:read-driver",
  "booking:approve-driver",
  "booking:reject-driver",
  "booking:board-driver",
  "booking:no-show-driver",
  "booking:read-admin",
  "booking:cancel-admin",
  "booking:audit-read",
  "parcel:create-own",
  "parcel:read-own",
  "parcel:update-own-draft",
  "parcel:submit-own",
  "parcel:cancel-own",
  "parcel:photo-manage-own",
  "parcel:handover-code-read-own",
  "parcel:handover-code-regenerate-own",
  "parcel:pickup-code-read-own",
  "parcel:read-driver",
  "parcel:accept-driver",
  "parcel:reject-driver",
  "parcel:handover-driver",
  "parcel:ready-driver",
  "parcel:deliver-driver",
  "parcel:issue-driver",
  "parcel:read-admin",
  "parcel:cancel-admin",
  "parcel:mark-lost-admin",
  "parcel:mark-damaged-admin",
  "parcel:dispute-admin",
  "parcel:audit-read",
  "conversation:read-own",
  "conversation:message-own",
  "conversation:report-message-own",
  "notification:read-own",
  "notification:manage-own",
  "notification:deliver-worker",
  "support-ticket:create-own",
  "support-ticket:read-own",
  "support-ticket:message-own",
  "support-ticket:read-admin",
  "support-ticket:reply-admin",
  "support-ticket:assign-admin",
  "support-ticket:status-admin",
  "support-ticket:internal-note-admin",
  "support-ticket:audit-read",
  "review:create-own",
  "review:read-own",
  "review:update-own",
  "review:delete-own",
  "review:report-own",
  "rating:read-public",
  "reliability:read-public",
  "user-block:manage-own",
  "safety-report:create-own",
  "safety-report:read-own",
  "trusted-contact:manage-own",
  "trip-share:manage-own",
  "emergency-action:create-own",
  "safety-report:read-admin",
  "safety-report:assign-admin",
  "safety-report:status-admin",
  "safety-report:internal-note-admin",
  "account-restriction:manage-admin",
  "moderation-case:read-admin",
  "payment:create-own",
  "payment:read-own",
  "payment:refund-request-own",
  "payment:cash-confirm-driver",
  "finance:read-admin",
  "finance:refund-admin",
  "finance:payout-admin",
  "finance:reconcile-admin",
  "analytics:event-create",
  "analytics:read-admin",
];

async function main() {
  for (const code of permissions) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, name: code },
      update: {},
    });
  }

  for (const code of roles) {
    await prisma.role.upsert({
      where: { code },
      create: { code, name: code },
      update: {},
    });
  }

  await prisma.legalDocument.upsert({
    where: { type_version_locale: { type: "terms", version: "0.1-local", locale: "ru" } },
    create: {
      type: "terms",
      version: "0.1-local",
      locale: "ru",
      title: "Nodex local terms placeholder",
      requiresReview: true,
    },
    update: {},
  });

  await prisma.systemSetting.upsert({
    where: { key: "booking.hold_ttl_minutes" },
    create: { key: "booking.hold_ttl_minutes", value: 15 },
    update: { value: 15 },
  });

  await prisma.featureFlag.upsert({
    where: { key: "mock_mode" },
    create: { key: "mock_mode", enabled: true, payload: { reason: "foundation" } },
    update: { enabled: true },
  });

  await seedIdentity({
    telegramUserId: 900000003n,
    username: "nodex_client",
    firstName: "Client",
    lastName: "Mock",
    roleCode: "CLIENT",
  });
  await seedIdentity({
    telegramUserId: 900000002n,
    username: "nodex_driver",
    firstName: "Driver",
    lastName: "Mock",
    roleCode: "DRIVER",
  });
  await seedIdentity({
    telegramUserId: 900000001n,
    username: "nodex_admin",
    firstName: "Admin",
    lastName: "Mock",
    roleCode: "ADMIN",
  });
  await seedIdentity({
    telegramUserId: 900000004n,
    username: "nodex_support",
    firstName: "Support",
    lastName: "Mock",
    roleCode: "SUPPORT",
  });
  await seedDriverVerificationFixtures();
  await seedVehicleFixtures();
  await seedTripSupplyFixtures();
  await seedBookingFixtures();
  await seedTripOperationsFixtures();
  await seedParcelFixtures();
  await seedCommunicationSupportFixtures();
  await seedTrustSafetyFixtures();
  await seedPaymentsAnalyticsLaunchFixtures();

  const adminTelegramIds = [
    process.env.SUPER_ADMIN_TELEGRAM_ID,
    ...(process.env.ADMIN_TELEGRAM_USER_IDS?.split(",") ?? []),
  ].filter(Boolean);
  for (const telegramUserId of adminTelegramIds) {
    await seedIdentity({
      telegramUserId: BigInt(telegramUserId!),
      username: null,
      firstName: null,
      lastName: null,
      roleCode: "ADMIN",
    });
  }
}

function normalizePlate(plateNumber: string) {
  return plateNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function seedDriverVerificationFixtures() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000001n } });
  const statuses = [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "CHANGES_REQUESTED",
    "APPROVED",
    "REJECTED",
    "SUSPENDED",
  ] as const;
  for (const [index, status] of statuses.entries()) {
    const telegramUserId = BigInt(900100000 + index);
    await seedIdentity({
      telegramUserId,
      username: `phase2_driver_${status.toLowerCase()}`,
      firstName: "Phase2",
      lastName: status,
      roleCode: "DRIVER",
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { telegramId: telegramUserId } });
    const profile = await prisma.driverProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        city: "Tashkent",
        onboardingStatus: "IN_PROGRESS",
        verificationStatus:
          status === "APPROVED"
            ? "APPROVED"
            : status === "REJECTED"
              ? "REJECTED"
              : status === "SUSPENDED"
                ? "SUSPENDED"
                : status === "DRAFT"
                  ? "NOT_SUBMITTED"
                  : "PENDING",
      },
      update: {
        city: "Tashkent",
        verificationStatus:
          status === "APPROVED"
            ? "APPROVED"
            : status === "REJECTED"
              ? "REJECTED"
              : status === "SUSPENDED"
                ? "SUSPENDED"
                : status === "DRAFT"
                  ? "NOT_SUBMITTED"
                  : "PENDING",
      },
    });
    const submittedAt = status === "DRAFT" ? null : new Date("2026-07-30T08:00:00.000Z");
    const application = await prisma.driverVerificationApplication.upsert({
      where: { driverProfileId_version: { driverProfileId: profile.id, version: 1 } },
      create: {
        driverProfileId: profile.id,
        createdByUserId: user.id,
        version: 1,
        status,
        submittedAt,
        reviewStartedAt: status === "UNDER_REVIEW" ? new Date("2026-07-30T09:00:00.000Z") : null,
        reviewedAt: ["APPROVED", "REJECTED", "CHANGES_REQUESTED", "SUSPENDED"].includes(status)
          ? new Date("2026-07-30T10:00:00.000Z")
          : null,
        approvedAt:
          status === "APPROVED" || status === "SUSPENDED"
            ? new Date("2026-07-30T10:00:00.000Z")
            : null,
        rejectedAt: status === "REJECTED" ? new Date("2026-07-30T10:00:00.000Z") : null,
        changesRequestedAt:
          status === "CHANGES_REQUESTED" ? new Date("2026-07-30T10:00:00.000Z") : null,
        reviewedByUserId: status === "DRAFT" || status === "SUBMITTED" ? null : admin.id,
        legalFirstName: "Test",
        legalLastName: `Driver ${index + 1}`,
        birthDate: new Date("1990-01-01T00:00:00.000Z"),
        citizenship: "UZ",
        personalIdentificationNumber: `PIN-FIXTURE-${index + 1}`,
        registeredAddress: "Fixture registered address",
        residentialAddress: "Fixture residential address",
        phone: `+99890000${String(index + 1).padStart(4, "0")}`,
        driverLicenseNumber: `DL-FIXTURE-${index + 1}`,
        driverLicenseIssuedAt: new Date("2020-01-01T00:00:00.000Z"),
        driverLicenseExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        driverLicenseCategory: "B",
        driverExperienceSince: new Date("2018-01-01T00:00:00.000Z"),
        vehicleMake: "Chevrolet",
        vehicleModel: "Cobalt",
        vehicleYear: 2022,
        vehicleColor: "White",
        vehiclePlateNumber: `01A${String(100 + index)}AA`,
        vehicleRegistrationNumber: `VR-FIXTURE-${index + 1}`,
        vehicleSeats: 4,
        consentAcceptedAt: submittedAt,
        consentVersion: "0.1-local",
        privacyVersion: "0.1-local",
        verificationPolicyVersion: "0.1-local",
      },
      update: { status },
    });
    await prisma.driverProfile.update({
      where: { id: profile.id },
      data: { currentApplicationId: application.id },
    });
    for (const type of [
      "IDENTITY_FRONT",
      "DRIVER_LICENSE_FRONT",
      "VEHICLE_REGISTRATION_FRONT",
      "DRIVER_SELFIE",
      "VEHICLE_FRONT",
    ] as const) {
      const key = `driver-verification/${application.id}/${type}/fixture-${index + 1}.jpg`;
      const file = await prisma.fileObject.upsert({
        where: { key },
        create: {
          bucket: "nodex-driver-documents-local",
          key,
          contentType: "image/jpeg",
          sizeBytes: 128000,
          scanStatus: "APPROVED",
        },
        update: {},
      });
      await prisma.driverVerificationDocument.upsert({
        where: { id: `${application.id}_${type}` },
        create: {
          id: `${application.id}_${type}`,
          applicationId: application.id,
          type,
          storageKey: key,
          fileObjectId: file.id,
          originalFileName: `${type.toLowerCase()}.jpg`,
          mimeType: "image/jpeg",
          size: 128000,
          checksum: `fixture-checksum-${index + 1}-${type}`,
        },
        update: {},
      });
    }
    if (status !== "DRAFT" && status !== "SUBMITTED") {
      await prisma.driverVerificationReview.create({
        data: {
          applicationId: application.id,
          reviewerUserId: admin.id,
          action:
            status === "UNDER_REVIEW"
              ? "START_REVIEW"
              : status === "APPROVED"
                ? "APPROVE"
                : status === "SUSPENDED"
                  ? "SUSPEND"
                  : status === "CHANGES_REQUESTED"
                    ? "REQUEST_CHANGES"
                    : "REJECT",
          reasonCode: status === "APPROVED" || status === "UNDER_REVIEW" ? null : "OTHER",
          comment:
            status === "APPROVED" || status === "UNDER_REVIEW" ? null : "Fixture moderation note",
          metadata: { fixture: true },
        },
      });
    }
  }
}

async function seedIdentity(input: {
  telegramUserId: bigint;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  roleCode: string;
}) {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: input.roleCode } });
  const user = await prisma.user.upsert({
    where: { telegramId: input.telegramUserId },
    create: {
      telegramId: input.telegramUserId,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: [input.firstName, input.lastName].filter(Boolean).join(" ") || input.username,
      locale: "ru",
    },
    update: {
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: [input.firstName, input.lastName].filter(Boolean).join(" ") || input.username,
    },
  });
  await prisma.telegramIdentity.upsert({
    where: { telegramUserId: input.telegramUserId },
    create: {
      userId: user.id,
      telegramUserId: input.telegramUserId,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      languageCode: "ru",
    },
    update: {
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      languageCode: "ru",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    create: { userId: user.id, roleId: role.id },
    update: {},
  });
  await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, locale: "ru", theme: "TELEGRAM" },
    update: {},
  });
  if (input.roleCode === "CLIENT") {
    await prisma.clientProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, city: "Tashkent" },
      update: {},
    });
  }
  if (input.roleCode === "DRIVER") {
    await prisma.driverProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, city: "Tashkent", onboardingStatus: "BASIC_COMPLETED" },
      update: {},
    });
  }
}

async function seedVehicleFixtures() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000001n } });
  const driver = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000002n } });
  const driverProfile = await prisma.driverProfile.upsert({
    where: { userId: driver.id },
    create: {
      userId: driver.id,
      city: "Tashkent",
      onboardingStatus: "BASIC_COMPLETED",
      verificationStatus: "APPROVED",
      verifiedAt: new Date("2026-07-30T10:00:00.000Z"),
    },
    update: {
      verificationStatus: "APPROVED",
      verifiedAt: new Date("2026-07-30T10:00:00.000Z"),
    },
  });
  const fixtures = [
    { status: "DRAFT", plate: "01 V 101 AA", make: "Chevrolet", model: "Cobalt", primary: false },
    {
      status: "SUBMITTED",
      plate: "01 V 102 AA",
      make: "Chevrolet",
      model: "Lacetti",
      primary: false,
    },
    { status: "UNDER_REVIEW", plate: "01 V 103 AA", make: "BYD", model: "Chazor", primary: false },
    {
      status: "APPROVED",
      plate: "01 V 104 AA",
      make: "Chevrolet",
      model: "Tracker",
      primary: true,
    },
    { status: "CHANGES_REQUESTED", plate: "01 V 105 AA", make: "Kia", model: "K5", primary: false },
  ] as const;
  for (const [index, fixture] of fixtures.entries()) {
    const submittedAt = fixture.status === "DRAFT" ? null : new Date("2026-08-01T08:00:00.000Z");
    const normalizedPlate = normalizePlate(fixture.plate);
    const existingVehicle = await prisma.vehicle.findFirst({
      where: { driverProfileId: driverProfile.id, normalizedPlate },
    });
    const vehicleData = {
      driverProfileId: driverProfile.id,
      make: fixture.make,
      model: fixture.model,
      year: 2023 - index,
      color: index % 2 === 0 ? "White" : "Black",
      plateNumber: fixture.plate,
      normalizedPlate,
      bodyType: "SEDAN",
      passengerSeatCount: 4,
      passengerSeats: 4,
      luggageCapacity: "2 medium bags",
      amenities: ["air_conditioning", "phone_charger"],
      isPrimary: fixture.primary,
      status: fixture.status,
      moderationStatus: fixture.status,
      submittedAt,
      reviewStartedAt:
        fixture.status === "UNDER_REVIEW" ? new Date("2026-08-01T09:00:00.000Z") : null,
      approvedAt: fixture.status === "APPROVED" ? new Date("2026-08-01T10:00:00.000Z") : null,
      changesRequestedAt:
        fixture.status === "CHANGES_REQUESTED" ? new Date("2026-08-01T10:00:00.000Z") : null,
    };
    const vehicle = existingVehicle
      ? await prisma.vehicle.update({
          where: { id: existingVehicle.id },
          data: vehicleData,
        })
      : await prisma.vehicle.create({
          data: vehicleData,
        });
    for (const type of ["REGISTRATION_CERTIFICATE", "INSURANCE"] as const) {
      const key = `vehicles/${vehicle.id}/documents/${type.toLowerCase()}.pdf`;
      const file = await prisma.fileObject.upsert({
        where: { key },
        create: {
          bucket: "nodex-vehicle-documents-local",
          key,
          contentType: "application/pdf",
          sizeBytes: 164000,
          scanStatus: "APPROVED",
        },
        update: {},
      });
      const existingDocument = await prisma.vehicleDocument.findFirst({
        where: { vehicleId: vehicle.id, type },
      });
      const documentData = {
        vehicleId: vehicle.id,
        type,
        storageKey: key,
        fileObjectId: file.id,
        originalFileName: `${type.toLowerCase()}.pdf`,
        mimeType: "application/pdf",
        size: 164000,
        checksum: `phase3-vehicle-doc-${index + 1}-${type}`,
      };
      if (existingDocument) {
        await prisma.vehicleDocument.update({
          where: { id: existingDocument.id },
          data: documentData,
        });
      } else {
        await prisma.vehicleDocument.create({
          data: documentData,
        });
      }
    }
    for (const type of ["FRONT", "REAR", "INTERIOR_FRONT", "PLATE"] as const) {
      const key = `vehicles/${vehicle.id}/photos/${type.toLowerCase()}.jpg`;
      const file = await prisma.fileObject.upsert({
        where: { key },
        create: {
          bucket: "nodex-vehicle-photos-local",
          key,
          contentType: "image/jpeg",
          sizeBytes: 210000,
          scanStatus: "APPROVED",
        },
        update: {},
      });
      const existingPhoto = await prisma.vehiclePhoto.findFirst({
        where: { vehicleId: vehicle.id, type },
      });
      const photoData = {
        vehicleId: vehicle.id,
        type,
        storageKey: key,
        fileObjectId: file.id,
        originalFileName: `${type.toLowerCase()}.jpg`,
        mimeType: "image/jpeg",
        size: 210000,
        checksum: `phase3-vehicle-photo-${index + 1}-${type}`,
      };
      if (existingPhoto) {
        await prisma.vehiclePhoto.update({
          where: { id: existingPhoto.id },
          data: photoData,
        });
      } else {
        await prisma.vehiclePhoto.create({
          data: photoData,
        });
      }
    }
    if (!["DRAFT", "SUBMITTED"].includes(fixture.status)) {
      await prisma.vehicleModerationReview.create({
        data: {
          vehicleId: vehicle.id,
          reviewerUserId: admin.id,
          action:
            fixture.status === "UNDER_REVIEW"
              ? "START_REVIEW"
              : fixture.status === "APPROVED"
                ? "APPROVE"
                : "REQUEST_CHANGES",
          reasonCode:
            fixture.status === "APPROVED" || fixture.status === "UNDER_REVIEW" ? null : "OTHER",
          comment:
            fixture.status === "APPROVED" || fixture.status === "UNDER_REVIEW"
              ? null
              : "Fixture vehicle moderation note",
          metadata: { fixture: true },
        },
      });
    }
  }
}

async function seedTripSupplyFixtures() {
  const regionRows = [
    { code: "uz-qr", name: "Republic of Karakalpakstan", sortOrder: 10 },
    { code: "uz-xo", name: "Khorezm Region", sortOrder: 20 },
    { code: "uz-bu", name: "Bukhara Region", sortOrder: 30 },
    { code: "uz-nw", name: "Navoiy Region", sortOrder: 40 },
  ];
  const regions = new Map<string, Awaited<ReturnType<typeof prisma.region.upsert>>>();
  for (const region of regionRows) {
    const saved = await prisma.region.upsert({
      where: { code: region.code },
      create: { countryCode: "UZ", ...region },
      update: { name: region.name, isActive: true, sortOrder: region.sortOrder },
    });
    regions.set(region.code, saved);
  }

  const cityRows = [
    ["nukus", "uz-qr", "Nukus", "Nukus", "No'kis", 42.4619, 59.6166, true, 10],
    ["kungrad", "uz-qr", "Kungrad", "Qo'ng'irot", "Qon'ırat", 43.0707, 58.9037, true, 20],
    ["khodjeyli", "uz-qr", "Khodjeyli", "Xo'jayli", "Xojeli", 42.4004, 59.4454, true, 30],
    ["takhiatash", "uz-qr", "Takhiatash", "Taxiatosh", "Taqıyatas", 42.3313, 59.5757, true, 40],
    ["chimbay", "uz-qr", "Chimbay", "Chimboy", "Shımbay", 42.9302, 59.7708, true, 50],
    ["muynak", "uz-qr", "Muynak", "Mo'ynoq", "Moynaq", 43.7683, 59.0214, true, 60],
    ["turtkul", "uz-qr", "Turtkul", "To'rtko'l", "Tortkul", 41.5504, 61.0018, true, 70],
    ["beruni", "uz-qr", "Beruni", "Beruniy", "Biruniy", 41.6911, 60.7525, true, 80],
    ["urgench", "uz-xo", "Urgench", "Urganch", "Urgench", 41.5506, 60.6316, true, 90],
    ["khiva", "uz-xo", "Khiva", "Xiva", "Xiywa", 41.3783, 60.3639, true, 100],
    ["bukhara", "uz-bu", "Bukhara", "Buxoro", "Buxara", 39.7747, 64.4286, true, 110],
    ["navoiy", "uz-nw", "Navoiy", "Navoiy", "Nawayı", 40.0844, 65.3792, true, 120],
  ] as const;
  const cities = new Map<string, Awaited<ReturnType<typeof prisma.city.upsert>>>();
  for (const [
    code,
    regionCode,
    nameRu,
    nameUz,
    nameKaa,
    latitude,
    longitude,
    isLaunchCity,
    sortOrder,
  ] of cityRows) {
    const region = regions.get(regionCode)!;
    const saved = await prisma.city.upsert({
      where: { code },
      create: {
        regionId: region.id,
        code,
        nameRu,
        nameUz,
        nameKaa,
        timezone: "Asia/Tashkent",
        latitude,
        longitude,
        isActive: true,
        isLaunchCity,
        sortOrder,
      },
      update: {
        regionId: region.id,
        nameRu,
        nameUz,
        nameKaa,
        latitude,
        longitude,
        isActive: true,
        isLaunchCity,
        sortOrder,
      },
    });
    cities.set(code, saved);
  }

  for (const city of cities.values()) {
    const pointRows = [
      ["City center", "Central pickup point", "CITY_CENTER", 10],
      ["Bus station", "Main bus station", "BUS_STATION", 20],
      ["Railway station", "Railway station area", "RAILWAY_STATION", 30],
    ] as const;
    for (const [name, address, type, sortOrder] of pointRows) {
      const existing = await prisma.pickupPoint.findFirst({ where: { cityId: city.id, name } });
      const data = {
        cityId: city.id,
        name,
        address,
        latitude: city.latitude,
        longitude: city.longitude,
        type,
        isActive: true,
        sortOrder,
      };
      if (existing) await prisma.pickupPoint.update({ where: { id: existing.id }, data });
      else await prisma.pickupPoint.create({ data });
    }
  }

  const routeRows = [
    ["nukus", "urgench", 170, 180],
    ["nukus", "khiva", 190, 210],
    ["nukus", "bukhara", 550, 510],
    ["nukus", "navoiy", 710, 650],
    ["kungrad", "nukus", 115, 110],
    ["turtkul", "urgench", 85, 95],
  ] as const;
  const routes = [];
  for (const [originCode, destinationCode, distanceKm, estimatedDurationMinutes] of routeRows) {
    const origin = cities.get(originCode)!;
    const destination = cities.get(destinationCode)!;
    const route = await prisma.route.upsert({
      where: {
        originCityId_destinationCityId: {
          originCityId: origin.id,
          destinationCityId: destination.id,
        },
      },
      create: {
        originCityId: origin.id,
        destinationCityId: destination.id,
        distanceKm,
        estimatedDurationMinutes,
        isActive: true,
      },
      update: { distanceKm, estimatedDurationMinutes, isActive: true },
    });
    routes.push(route);
  }

  const driver = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000002n } });
  const driverProfile = await prisma.driverProfile.findUniqueOrThrow({
    where: { userId: driver.id },
  });
  const vehicle = await prisma.vehicle.findFirstOrThrow({
    where: { driverProfileId: driverProfile.id, status: "APPROVED", archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const tripRows = [
    { route: routes[0]!, status: "DRAFT", offsetDays: 7, seats: 3, price: 8500000n },
    { route: routes[0]!, status: "PUBLISHED", offsetDays: 7, seats: 4, price: 8500000n },
    { route: routes[0]!, status: "PUBLISHED", offsetDays: 7, seats: 2, price: 9200000n },
    { route: routes[1]!, status: "PUBLISHED", offsetDays: 9, seats: 4, price: 9500000n },
    { route: routes[2]!, status: "UNPUBLISHED", offsetDays: 11, seats: 4, price: 18000000n },
  ] as const;
  const seededTrips = [];
  for (const [index, row] of tripRows.entries()) {
    const origin = await prisma.city.findUniqueOrThrow({ where: { id: row.route.originCityId } });
    const destination = await prisma.city.findUniqueOrThrow({
      where: { id: row.route.destinationCityId },
    });
    const departureHourUtc = index === 0 ? 3 : index === 2 ? 13 : 5;
    const departureAtUtc = new Date(Date.UTC(2026, 7, 1 + row.offsetDays, departureHourUtc, 0, 0));
    const existing = await prisma.trip.findFirst({
      where: { driverProfileId: driverProfile.id, routeId: row.route.id, departureAtUtc },
    });
    const data = {
      driverProfileId: driverProfile.id,
      vehicleId: vehicle.id,
      routeId: row.route.id,
      originCityId: origin.id,
      destinationCityId: destination.id,
      originCity: origin.nameRu,
      destinationCity: destination.nameRu,
      departureAtUtc,
      arrivalEstimateAtUtc: new Date(
        departureAtUtc.getTime() + (row.route.estimatedDurationMinutes ?? 180) * 60_000,
      ),
      timezone: origin.timezone,
      status: row.status,
      passengerSeatCapacity: row.seats,
      availableSeatCount: row.seats,
      pricePerSeatMinor: row.price,
      wholeCarPriceMinor: row.price * BigInt(row.seats),
      parcelSupported: index !== 2,
      parcelPriceMinor: index === 2 ? null : 2500000n,
      currency: "UZS",
      luggageRules: "One suitcase and one small bag per passenger",
      comment: index > 0 ? "Phase 5 searchable trip fixture" : "Phase 4 seed trip",
      publishedAt: row.status === "PUBLISHED" ? new Date("2026-08-01T10:00:00.000Z") : null,
      unpublishedAt: row.status === "UNPUBLISHED" ? new Date("2026-08-01T11:00:00.000Z") : null,
      publicationValidationSnapshot: { fixture: true, errors: [] },
    };
    const trip = existing
      ? await prisma.trip.update({ where: { id: existing.id }, data })
      : await prisma.trip.create({ data });
    seededTrips.push(trip);
    await prisma.tripSeatSnapshot.upsert({
      where: { tripId: trip.id },
      create: {
        tripId: trip.id,
        vehicleId: vehicle.id,
        passengerSeatCapacity: row.seats,
        availableSeatCount: row.seats,
        seatLabels: ["1", "2", "3", "4"].slice(0, row.seats),
      },
      update: {
        vehicleId: vehicle.id,
        passengerSeatCapacity: row.seats,
        availableSeatCount: row.seats,
      },
    });
    const originPoint = await prisma.pickupPoint.findFirst({
      where: { cityId: origin.id, type: "BUS_STATION" },
    });
    const destinationPoint = await prisma.pickupPoint.findFirst({
      where: { cityId: destination.id, type: "BUS_STATION" },
    });
    for (const stop of [
      {
        city: origin,
        point: originPoint,
        order: 0,
        type: "ORIGIN" as const,
        plannedAtUtc: departureAtUtc,
      },
      {
        city: destination,
        point: destinationPoint,
        order: 1,
        type: "DESTINATION" as const,
        plannedAtUtc: data.arrivalEstimateAtUtc,
      },
    ]) {
      const existingStop = await prisma.tripStop.findFirst({
        where: { tripId: trip.id, order: stop.order },
      });
      const stopData = {
        tripId: trip.id,
        cityId: stop.city.id,
        pickupPointId: stop.point?.id ?? null,
        order: stop.order,
        type: stop.type,
        plannedAtUtc: stop.plannedAtUtc,
        label: stop.point?.name ?? stop.city.nameRu,
        address: stop.point?.address ?? null,
        latitude: stop.point?.latitude ?? stop.city.latitude,
        longitude: stop.point?.longitude ?? stop.city.longitude,
      };
      if (existingStop)
        await prisma.tripStop.update({ where: { id: existingStop.id }, data: stopData });
      else await prisma.tripStop.create({ data: stopData });
    }
  }

  await prisma.searchEvent.deleteMany({ where: { sessionId: "phase5-seed" } });
  const publishedFixture = seededTrips.find((trip) => trip.status === "PUBLISHED");
  if (publishedFixture) {
    await prisma.searchEvent.createMany({
      data: [
        {
          sessionId: "phase5-seed",
          originCityId: publishedFixture.originCityId,
          destinationCityId: publishedFixture.destinationCityId,
          tripId: publishedFixture.id,
          queryDate: publishedFixture.departureAtUtc,
          passengers: 2,
          sort: "departure_asc",
          filtersJson: { parcelSupported: true, fixture: true },
          resultCount: 2,
          type: "SEARCH_PERFORMED",
        },
        {
          sessionId: "phase5-seed",
          originCityId: publishedFixture.originCityId,
          destinationCityId: publishedFixture.destinationCityId,
          tripId: publishedFixture.id,
          queryDate: publishedFixture.departureAtUtc,
          passengers: 2,
          sort: "departure_asc",
          filtersJson: { fixture: true },
          resultCount: 2,
          selectedResultRank: 1,
          type: "TRIP_RESULT_OPENED",
        },
      ],
    });
  }
}

function bookingSeatLayout(capacity: number) {
  const labels = [
    { seatKey: "FRONT_RIGHT", label: "Front right", row: 0, column: 1, seatType: "FRONT" },
    { seatKey: "ROW_1_LEFT", label: "Row 1 left", row: 1, column: 0, seatType: "REAR" },
    { seatKey: "ROW_1_RIGHT", label: "Row 1 right", row: 1, column: 1, seatType: "REAR" },
    { seatKey: "ROW_2_LEFT", label: "Row 2 left", row: 2, column: 0, seatType: "STANDARD" },
    { seatKey: "ROW_2_RIGHT", label: "Row 2 right", row: 2, column: 1, seatType: "STANDARD" },
    { seatKey: "ROW_3_LEFT", label: "Row 3 left", row: 3, column: 0, seatType: "STANDARD" },
    { seatKey: "ROW_3_RIGHT", label: "Row 3 right", row: 3, column: 1, seatType: "STANDARD" },
    { seatKey: "ROW_4_LEFT", label: "Row 4 left", row: 4, column: 0, seatType: "STANDARD" },
  ] as const;
  return labels.slice(0, Math.max(1, Math.min(capacity, labels.length)));
}

async function seedBookingFixtures() {
  const client = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000003n } });
  const trip = await prisma.trip.findFirstOrThrow({
    where: { status: "PUBLISHED", originCity: "Nukus", destinationCity: "Urgench" },
    include: { origin: true, destination: true },
    orderBy: { departureAtUtc: "asc" },
  });
  const layout = bookingSeatLayout(trip.passengerSeatCapacity);

  for (const seat of layout) {
    await prisma.tripSeat.upsert({
      where: { tripId_seatKey: { tripId: trip.id, seatKey: seat.seatKey } },
      create: {
        tripId: trip.id,
        seatKey: seat.seatKey,
        label: seat.label,
        row: seat.row,
        column: seat.column,
        seatType: seat.seatType,
        priceMinor: trip.pricePerSeatMinor,
        status: "AVAILABLE",
      },
      update: {
        label: seat.label,
        row: seat.row,
        column: seat.column,
        seatType: seat.seatType,
        priceMinor: trip.pricePerSeatMinor,
      },
    });
  }

  const confirmedSeats = layout.slice(0, Math.min(2, layout.length));
  const heldSeat = layout[2];
  const cancelledSeat = layout[3];
  const now = new Date("2026-08-01T10:00:00.000Z");

  const bookingFixtures = [
    {
      id: "phase6-booking-confirmed",
      type: "MULTI_SEAT" as const,
      status: "CONFIRMED" as const,
      seats: confirmedSeats,
      passengerCount: confirmedSeats.length,
      totalMinor: trip.pricePerSeatMinor * BigInt(confirmedSeats.length),
      paymentMethod: "CASH" as const,
      confirmedAt: now,
    },
    {
      id: "phase6-booking-hold",
      type: "SEAT" as const,
      status: "HOLD" as const,
      seats: heldSeat ? [heldSeat] : [],
      passengerCount: 1,
      totalMinor: trip.pricePerSeatMinor,
      paymentMethod: "MANUAL_TRANSFER" as const,
      confirmedAt: null,
    },
    {
      id: "phase6-booking-cancelled",
      type: "SEAT" as const,
      status: "CANCELLED_BY_CLIENT" as const,
      seats: cancelledSeat ? [cancelledSeat] : [],
      passengerCount: 1,
      totalMinor: trip.pricePerSeatMinor,
      paymentMethod: "CASH" as const,
      confirmedAt: now,
    },
  ];

  for (const fixture of bookingFixtures) {
    if (fixture.seats.length === 0) continue;
    const booking = await prisma.booking.upsert({
      where: { id: fixture.id },
      create: {
        id: fixture.id,
        tripId: trip.id,
        clientId: client.id,
        type: fixture.type,
        status: fixture.status,
        paymentMethod: fixture.paymentMethod,
        currency: "UZS",
        totalMinor: fixture.totalMinor,
        passengerCount: fixture.passengerCount,
        pricingSnapshot: { fixture: true, totalMinor: fixture.totalMinor.toString() },
        tripSnapshot: {
          fixture: true,
          originCity: trip.originCity,
          destinationCity: trip.destinationCity,
          departureAtUtc: trip.departureAtUtc.toISOString(),
        },
        termsSnapshot: { version: "0.1-local" },
        expiresAt: new Date("2026-08-01T10:10:00.000Z"),
        confirmedAt: fixture.confirmedAt,
        cancelledAt:
          fixture.status === "CANCELLED_BY_CLIENT" ? new Date("2026-08-01T10:12:00.000Z") : null,
        cancellationReason:
          fixture.status === "CANCELLED_BY_CLIENT" ? "Fixture client cancellation" : null,
      },
      update: {
        status: fixture.status,
        paymentMethod: fixture.paymentMethod,
        totalMinor: fixture.totalMinor,
        passengerCount: fixture.passengerCount,
        confirmedAt: fixture.confirmedAt,
      },
    });

    await prisma.seatHold.upsert({
      where: { tripId_idempotencyKey: { tripId: trip.id, idempotencyKey: `${fixture.id}-hold` } },
      create: {
        id: `${fixture.id}-hold`,
        tripId: trip.id,
        clientId: client.id,
        bookingId: booking.id,
        idempotencyKey: `${fixture.id}-hold`,
        status: fixture.status === "HOLD" ? "ACTIVE" : "CONFIRMED",
        expiresAt: new Date("2026-08-01T10:10:00.000Z"),
        confirmedAt: fixture.status === "CONFIRMED" ? fixture.confirmedAt : null,
      },
      update: {
        bookingId: booking.id,
        status: fixture.status === "HOLD" ? "ACTIVE" : "CONFIRMED",
      },
    });

    for (const seat of fixture.seats) {
      const tripSeat = await prisma.tripSeat.findUniqueOrThrow({
        where: { tripId_seatKey: { tripId: trip.id, seatKey: seat.seatKey } },
      });
      await prisma.seatHoldItem.upsert({
        where: {
          seatHoldId_seatKey: { seatHoldId: `${fixture.id}-hold`, seatKey: seat.seatKey },
        },
        create: {
          seatHoldId: `${fixture.id}-hold`,
          tripSeatId: tripSeat.id,
          seatKey: seat.seatKey,
        },
        update: { tripSeatId: tripSeat.id },
      });
      await prisma.bookingSeat.upsert({
        where: { bookingId_seatKey: { bookingId: booking.id, seatKey: seat.seatKey } },
        create: {
          bookingId: booking.id,
          tripSeatId: tripSeat.id,
          seatKey: seat.seatKey,
          priceMinor: trip.pricePerSeatMinor,
          status: fixture.status === "HOLD" ? "HELD" : "BOOKED",
        },
        update: {
          tripSeatId: tripSeat.id,
          priceMinor: trip.pricePerSeatMinor,
          status:
            fixture.status === "CANCELLED_BY_CLIENT"
              ? "CANCELLED"
              : fixture.status === "HOLD"
                ? "HELD"
                : "BOOKED",
        },
      });
    }

    await prisma.bookingPassenger.deleteMany({ where: { bookingId: booking.id } });
    await prisma.bookingPassenger.createMany({
      data: fixture.seats.map((seat, index) => ({
        bookingId: booking.id,
        firstName: index === 0 ? "Aman" : "Passenger",
        lastName: "Fixture",
        phone: index === 0 ? "+998900001111" : null,
        ageCategory: "ADULT",
        isPrimary: index === 0,
        seatKey: seat.seatKey,
      })),
    });

    await prisma.bookingBaggage.deleteMany({ where: { bookingId: booking.id } });
    await prisma.bookingBaggage.create({
      data: { bookingId: booking.id, type: "SUITCASE", quantity: 1, weightKg: 12 },
    });
    await prisma.bookingTimelineEvent.deleteMany({ where: { bookingId: booking.id } });
    await prisma.bookingTimelineEvent.createMany({
      data: [
        { bookingId: booking.id, actorUserId: client.id, type: "BOOKING_HOLD_CREATED" },
        { bookingId: booking.id, actorUserId: client.id, type: `BOOKING_${fixture.status}` },
      ],
    });
  }

  await prisma.tripSeat.updateMany({
    where: { tripId: trip.id },
    data: { status: "AVAILABLE" },
  });
  await prisma.tripSeat.updateMany({
    where: { tripId: trip.id, seatKey: { in: confirmedSeats.map((seat) => seat.seatKey) } },
    data: { status: "BOOKED" },
  });
  if (heldSeat) {
    await prisma.tripSeat.update({
      where: { tripId_seatKey: { tripId: trip.id, seatKey: heldSeat.seatKey } },
      data: { status: "HELD" },
    });
  }
  await prisma.trip.update({
    where: { id: trip.id },
    data: { availableSeatCount: Math.max(0, trip.passengerSeatCapacity - confirmedSeats.length) },
  });
}

async function seedTripOperationsFixtures() {
  const client = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000003n } });
  const driver = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000002n } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000001n } });
  const driverProfile = await prisma.driverProfile.findUniqueOrThrow({
    where: { userId: driver.id },
  });
  const trips = await prisma.trip.findMany({
    where: { driverProfileId: driverProfile.id },
    orderBy: { departureAtUtc: "asc" },
    include: { bookings: { include: { seats: true } } },
    take: 5,
  });
  const boardingTrip = trips.find((trip) => trip.bookings.length > 0) ?? trips[0];
  const inProgressTrip = trips.find(
    (trip) => trip.id !== boardingTrip?.id && trip.status === "PUBLISHED",
  );
  const completedTrip = trips.find(
    (trip) => trip.id !== boardingTrip?.id && trip.id !== inProgressTrip?.id,
  );
  if (!boardingTrip) return;

  await prisma.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id: boardingTrip.id },
      data: { status: "BOARDING", version: { increment: 1 } },
    });
    await tx.tripOperationEvent.deleteMany({ where: { tripId: boardingTrip.id } });
    await tx.tripStatusTransition.deleteMany({ where: { tripId: boardingTrip.id } });
    await tx.noShowRecord.deleteMany({ where: { tripId: boardingTrip.id } });
    await tx.tripOperationEvent.createMany({
      data: [
        {
          tripId: boardingTrip.id,
          actorUserId: driver.id,
          type: "TRIP_BOARDING",
          payload: { fixture: true },
        },
        {
          tripId: boardingTrip.id,
          actorUserId: driver.id,
          type: "BOARDING_CODE_GENERATED",
          payload: { fixture: true },
        },
      ],
    });
    await tx.tripStatusTransition.create({
      data: {
        tripId: boardingTrip.id,
        actorUserId: driver.id,
        fromStatus: "PUBLISHED",
        toStatus: "BOARDING",
        reason: "Phase 7 fixture boarding",
      },
    });

    const confirmed = await tx.booking.findUnique({
      where: { id: "phase6-booking-confirmed" },
      include: { seats: true },
    });
    if (confirmed) {
      await tx.booking.update({
        where: { id: confirmed.id },
        data: { status: "BOARDING", version: { increment: 1 } },
      });
      await tx.bookingSeat.updateMany({
        where: { bookingId: confirmed.id, status: "BOOKED" },
        data: { status: "OCCUPIED" },
      });
      await tx.tripSeat.updateMany({
        where: {
          tripId: confirmed.tripId,
          seatKey: { in: confirmed.seats.map((seat) => seat.seatKey) },
        },
        data: { status: "OCCUPIED", version: { increment: 1 } },
      });
      await tx.boardingCode.deleteMany({ where: { bookingId: confirmed.id } });
      await tx.boardingCode.create({
        data: {
          bookingId: confirmed.id,
          codeHash: hashSecret("482913"),
          codeLength: 6,
          status: "ACTIVE",
          expiresAt: new Date("2026-08-08T06:25:00.000Z"),
          maxAttempts: 5,
        },
      });
      await tx.bookingOperationEvent.deleteMany({ where: { bookingId: confirmed.id } });
      await tx.bookingOperationEvent.createMany({
        data: [
          {
            bookingId: confirmed.id,
            actorUserId: client.id,
            type: "BOARDING_CODE_GENERATED",
            payload: { fixture: true },
          },
          {
            bookingId: confirmed.id,
            actorUserId: driver.id,
            type: "BOOKING_BOARDED",
            payload: { fixture: true },
          },
        ],
      });
    }

    const hold = await tx.booking.findUnique({ where: { id: "phase6-booking-hold" } });
    if (hold) {
      await tx.booking.update({
        where: { id: hold.id },
        data: { status: "NO_SHOW_CLIENT", cancellationReason: "Phase 7 fixture no-show" },
      });
      await tx.noShowRecord.create({
        data: {
          tripId: hold.tripId,
          bookingId: hold.id,
          actorUserId: driver.id,
          actorRole: "DRIVER",
          type: "CLIENT",
          reason: "Phase 7 fixture no-show",
        },
      });
    }
  });

  if (inProgressTrip) {
    await prisma.trip.update({
      where: { id: inProgressTrip.id },
      data: { status: "IN_PROGRESS", version: { increment: 1 } },
    });
    await prisma.tripExecution.upsert({
      where: { tripId: inProgressTrip.id },
      create: {
        tripId: inProgressTrip.id,
        status: "IN_PROGRESS",
        startedAt: new Date("2026-08-08T05:05:00.000Z"),
      },
      update: { status: "IN_PROGRESS", startedAt: new Date("2026-08-08T05:05:00.000Z") },
    });
  }

  if (completedTrip) {
    await prisma.trip.update({
      where: { id: completedTrip.id },
      data: { status: "COMPLETED", version: { increment: 1 } },
    });
    await prisma.tripCompletionSummary.upsert({
      where: { tripId: completedTrip.id },
      create: {
        tripId: completedTrip.id,
        completedByUserId: driver.id,
        boardedCount: 1,
        noShowClientCount: 0,
        cancelledCount: 0,
        totalBookingsCount: 1,
        notes: "Phase 7 completed trip fixture",
      },
      update: { completedByUserId: driver.id, notes: "Phase 7 completed trip fixture" },
    });
  }

  const cancelledTrip = trips.find(
    (trip) =>
      trip.id !== boardingTrip.id &&
      trip.id !== inProgressTrip?.id &&
      trip.id !== completedTrip?.id,
  );
  if (cancelledTrip) {
    await prisma.trip.update({
      where: { id: cancelledTrip.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date("2026-08-08T06:00:00.000Z"),
        cancellationReason: "Phase 7 operational cancellation fixture",
      },
    });
    await prisma.tripCancellation.deleteMany({ where: { tripId: cancelledTrip.id } });
    await prisma.tripCancellation.create({
      data: {
        tripId: cancelledTrip.id,
        actorUserId: admin.id,
        actorRole: "ADMIN",
        reason: "Phase 7 operational cancellation fixture",
      },
    });
  }
}

async function seedParcelFixtures() {
  const categories = [
    ["DOCUMENTS", "Documents", "Paper documents and envelopes"],
    ["CLOTHING", "Clothing", "Clothes and textile parcels"],
    ["ELECTRONICS", "Electronics", "Small consumer electronics"],
    ["FOOD_NON_PERISHABLE", "Non-perishable food", "Sealed food with stable shelf life"],
    ["MEDICINE_NON_PRESCRIPTION", "Non-prescription medicine", "Allowed over-the-counter medicine"],
    ["PERSONAL_ITEMS", "Personal items", "Small personal goods"],
    ["AUTO_PARTS_SMALL", "Small auto parts", "Compact non-hazardous parts"],
    ["OTHER", "Other allowed parcel", "Allowed parcel after sender declaration"],
  ] as const;
  for (const [index, [code, name, description]] of categories.entries()) {
    await prisma.parcelCategory.upsert({
      where: { code },
      create: { code, name, description, sortOrder: index },
      update: { name, description, isActive: true, sortOrder: index },
    });
  }

  const prohibited = [
    ["CASH", "Cash"],
    ["BANK_CARDS", "Bank cards"],
    ["JEWELRY_HIGH_VALUE", "High-value jewelry"],
    ["WEAPONS", "Weapons"],
    ["AMMUNITION", "Ammunition"],
    ["EXPLOSIVES", "Explosives"],
    ["DRUGS", "Drugs"],
    ["ALCOHOL", "Alcohol"],
    ["TOBACCO", "Tobacco"],
    ["PERISHABLE_FOOD", "Perishable food"],
    ["ANIMALS", "Animals"],
    ["HAZARDOUS_MATERIALS", "Hazardous materials"],
    ["ILLEGAL_ITEMS", "Illegal items"],
    ["UNKNOWN_CONTENT", "Unknown content"],
  ] as const;
  for (const [index, [code, name]] of prohibited.entries()) {
    await prisma.prohibitedParcelCategory.upsert({
      where: { code },
      create: {
        code,
        name,
        description: "Prohibited for intercity parcel delivery",
        sortOrder: index,
      },
      update: { name, isActive: true, sortOrder: index },
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: "parcel.limits" },
    create: {
      key: "parcel.limits",
      value: {
        maxWeightGrams: 20000,
        maxLengthCm: 80,
        maxWidthCm: 60,
        maxHeightCm: 60,
        maxDeclaredValueMinor: 500000000,
        maxPhotos: 6,
      },
    },
    update: {
      value: {
        maxWeightGrams: 20000,
        maxLengthCm: 80,
        maxWidthCm: 60,
        maxHeightCm: 60,
        maxDeclaredValueMinor: 500000000,
        maxPhotos: 6,
      },
    },
  });

  const client = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000003n } });
  const driver = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000002n } });
  const driverProfile = await prisma.driverProfile.findUniqueOrThrow({
    where: { userId: driver.id },
  });
  const vehicle = await prisma.vehicle.findFirstOrThrow({
    where: { driverProfileId: driverProfile.id, status: "APPROVED" },
  });
  const trip = await prisma.trip.findFirstOrThrow({
    where: {
      driverProfileId: driverProfile.id,
      vehicleId: vehicle.id,
      parcelSupported: true,
      status: { in: ["PUBLISHED", "BOOKING_OPEN", "BOARDING", "IN_PROGRESS"] },
    },
    orderBy: { departureAtUtc: "asc" },
  });
  const category = await prisma.parcelCategory.findUniqueOrThrow({ where: { code: "DOCUMENTS" } });
  const pickupPoint = await prisma.pickupPoint.findFirst({ orderBy: { sortOrder: "asc" } });
  const statuses = [
    "DRAFT",
    "ACCEPTED",
    "HANDED_TO_DRIVER",
    "IN_TRANSIT",
    "READY_FOR_PICKUP",
    "DELIVERED",
    "CANCELLED_BY_SENDER",
    "DAMAGED",
    "DISPUTED",
  ] as const;
  for (const [index, status] of statuses.entries()) {
    const id = `phase8-parcel-${status.toLowerCase().replaceAll("_", "-")}`;
    await prisma.parcelTimelineEvent.deleteMany({ where: { parcelId: id } });
    await prisma.parcelEvent.deleteMany({ where: { parcelId: id } });
    await prisma.parcelIssue.deleteMany({ where: { parcelId: id } });
    await prisma.parcelCancellation.deleteMany({ where: { parcelId: id } });
    await prisma.parcelHandoverCode.deleteMany({ where: { parcelId: id } });
    await prisma.parcelPickupCode.deleteMany({ where: { parcelId: id } });
    await prisma.parcelAttachment.deleteMany({ where: { parcelId: id } });
    const created = await prisma.parcelOrder.upsert({
      where: { id },
      create: {
        id,
        senderUserId: client.id,
        tripId: trip.id,
        driverProfileId: driverProfile.id,
        vehicleId: vehicle.id,
        categoryId: category.id,
        status,
        title: `Phase 8 ${status.toLowerCase().replaceAll("_", " ")} parcel`,
        description: "Seeded parcel fixture for lifecycle, moderation, and smoke tests.",
        weightGrams: 1200 + index * 100,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 10,
        declaredValueMinor: 10000000n,
        priceMinor: trip.parcelPriceMinor ?? 3000000n,
        senderName: "Client Mock",
        senderPhone: "+998900000003",
        recipientName: "Recipient Mock",
        recipientPhone: "+998901234567",
        pickupPointId: pickupPoint?.id ?? null,
        destinationPickupPointId: pickupPoint?.id ?? null,
        pickupLabel: "Nukus Central Station",
        destinationLabel: "Urgench Bus Station",
        contentDeclarationAcceptedAt: new Date("2026-08-01T09:00:00.000Z"),
        packagingDeclarationAcceptedAt: new Date("2026-08-01T09:00:00.000Z"),
        termsSnapshot: { version: "0.1-local" },
        pricingSnapshot: { currency: "UZS" },
        handoverAt: ["HANDED_TO_DRIVER", "IN_TRANSIT", "READY_FOR_PICKUP", "DELIVERED"].includes(
          status,
        )
          ? new Date("2026-08-01T09:20:00.000Z")
          : null,
        inTransitAt: ["IN_TRANSIT", "READY_FOR_PICKUP", "DELIVERED"].includes(status)
          ? new Date("2026-08-01T10:00:00.000Z")
          : null,
        readyForPickupAt: ["READY_FOR_PICKUP", "DELIVERED"].includes(status)
          ? new Date("2026-08-01T12:00:00.000Z")
          : null,
        deliveredAt: status === "DELIVERED" ? new Date("2026-08-01T12:20:00.000Z") : null,
        cancelledAt: status === "CANCELLED_BY_SENDER" ? new Date("2026-08-01T09:40:00.000Z") : null,
      },
      update: { status, driverProfileId: driverProfile.id, vehicleId: vehicle.id, tripId: trip.id },
    });
    await prisma.parcelEvent.create({
      data: {
        parcelId: created.id,
        actorUserId: client.id,
        type: "PARCEL_SEEDED",
        payload: { status },
      },
    });
    await prisma.parcelTimelineEvent.create({
      data: {
        parcelId: created.id,
        actorUserId: client.id,
        type: "PARCEL_SEEDED",
        payload: { status },
      },
    });
    if (["ACCEPTED", "HANDED_TO_DRIVER"].includes(status)) {
      await prisma.parcelHandoverCode.create({
        data: {
          parcelId: created.id,
          codeHash: hashSecret("482913"),
          codeLength: 6,
          expiresAt: new Date("2026-08-02T09:00:00.000Z"),
        },
      });
    }
    if (["READY_FOR_PICKUP", "DELIVERED"].includes(status)) {
      await prisma.parcelPickupCode.create({
        data: {
          parcelId: created.id,
          codeHash: hashSecret("739201"),
          codeLength: 6,
          expiresAt: new Date("2026-08-02T12:00:00.000Z"),
          verifiedAt: status === "DELIVERED" ? new Date("2026-08-01T12:20:00.000Z") : null,
          status: status === "DELIVERED" ? "VERIFIED" : "ACTIVE",
        },
      });
    }
    if (status === "DAMAGED" || status === "DISPUTED") {
      await prisma.parcelIssue.create({
        data: {
          parcelId: created.id,
          actorUserId: driver.id,
          actorRole: "DRIVER",
          type: status,
          reason: "Seeded parcel issue",
        },
      });
    }
    if (status === "CANCELLED_BY_SENDER") {
      await prisma.parcelCancellation.create({
        data: {
          parcelId: created.id,
          actorUserId: client.id,
          actorRole: "CLIENT",
          reason: "Seeded sender cancellation",
        },
      });
    }
  }
}

async function seedCommunicationSupportFixtures() {
  const client = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000003n } });
  const driver = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000002n } });
  const support = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000004n } });
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: "phase6-booking-confirmed" },
  });
  const parcel = await prisma.parcelOrder.findUniqueOrThrow({
    where: { id: "phase8-parcel-accepted" },
  });

  for (const policy of [
    { priority: "LOW" as const, firstResponseMinutes: 720, resolutionMinutes: 4320 },
    { priority: "NORMAL" as const, firstResponseMinutes: 240, resolutionMinutes: 1440 },
    { priority: "HIGH" as const, firstResponseMinutes: 60, resolutionMinutes: 480 },
    { priority: "URGENT" as const, firstResponseMinutes: 15, resolutionMinutes: 120 },
  ]) {
    await prisma.supportSlaPolicy.upsert({
      where: { priority: policy.priority },
      create: policy,
      update: policy,
    });
  }

  for (const template of [
    {
      channel: "TELEGRAM" as const,
      type: "CHAT_MESSAGE" as const,
      version: "phase9-v1",
      title: "Новое сообщение",
      body: "У вас новое сообщение в Nodex.",
    },
    {
      channel: "IN_APP" as const,
      type: "SUPPORT_TICKET_UPDATED" as const,
      version: "phase9-v1",
      title: "Обращение обновлено",
      body: "Команда поддержки обновила ваше обращение.",
    },
  ]) {
    await prisma.notificationTemplate.upsert({
      where: {
        type_channel_version: {
          type: template.type,
          channel: template.channel,
          version: template.version,
        },
      },
      create: template,
      update: template,
    });
  }

  const bookingConversation = await prisma.conversation.upsert({
    where: { bookingId: booking.id },
    create: {
      type: "BOOKING",
      bookingId: booking.id,
      tripId: booking.tripId,
      retentionUntil: new Date("2026-09-01T00:00:00.000Z"),
      participants: {
        create: [
          { userId: client.id, role: "CLIENT" },
          { userId: driver.id, role: "DRIVER" },
        ],
      },
    },
    update: {},
  });
  const parcelConversation = await prisma.conversation.upsert({
    where: { parcelOrderId: parcel.id },
    create: {
      type: "PARCEL",
      parcelOrderId: parcel.id,
      tripId: parcel.tripId,
      retentionUntil: new Date("2026-09-01T00:00:00.000Z"),
      participants: {
        create: [
          { userId: client.id, role: "CLIENT" },
          { userId: driver.id, role: "DRIVER" },
        ],
      },
    },
    update: {},
  });

  const seededMessages = [
    {
      conversationId: bookingConversation.id,
      senderUserId: client.id,
      clientMessageId: "phase9-booking-client-hello",
      text: "Здравствуйте, я буду у pickup point за 10 минут.",
    },
    {
      conversationId: bookingConversation.id,
      senderUserId: driver.id,
      clientMessageId: "phase9-booking-driver-reply",
      text: "Хорошо, напишу перед прибытием.",
    },
    {
      conversationId: parcelConversation.id,
      senderUserId: driver.id,
      clientMessageId: "phase9-parcel-driver-status",
      text: "Посылка принята, еду по маршруту.",
    },
  ];
  for (const seeded of seededMessages) {
    const message = await prisma.chatMessage.upsert({
      where: {
        conversationId_clientMessageId: {
          conversationId: seeded.conversationId,
          clientMessageId: seeded.clientMessageId,
        },
      },
      create: { ...seeded, type: "TEXT" },
      update: { text: seeded.text },
    });
    await prisma.chatMessageReceipt.upsert({
      where: { messageId_recipientUserId: { messageId: message.id, recipientUserId: client.id } },
      create: {
        messageId: message.id,
        recipientUserId: client.id,
        status: "READ",
        deliveredAt: new Date("2026-08-01T09:20:00.000Z"),
        readAt: new Date("2026-08-01T09:21:00.000Z"),
      },
      update: {},
    });
  }

  const notification = await prisma.notification.upsert({
    where: { deduplicationKey: "phase9:support:update:client" },
    create: {
      recipientUserId: client.id,
      type: "SUPPORT_TICKET_UPDATED",
      title: "Support ticket updated",
      body: "Your support ticket has a new response.",
      entityType: "SupportTicket",
      deduplicationKey: "phase9:support:update:client",
    },
    update: {},
  });
  await prisma.notificationDelivery.upsert({
    where: { notificationId_channel: { notificationId: notification.id, channel: "IN_APP" } },
    create: {
      notificationId: notification.id,
      recipientUserId: client.id,
      channel: "IN_APP",
      status: "DELIVERED",
      deliveredAt: new Date("2026-08-01T09:22:00.000Z"),
    },
    update: {},
  });

  let ticket = await prisma.supportTicket.findFirst({
    where: { requesterUserId: client.id, subject: "Phase 9 seeded support ticket" },
  });
  if (!ticket) {
    ticket = await prisma.supportTicket.create({
      data: {
        requesterUserId: client.id,
        type: "BOOKING",
        subject: "Phase 9 seeded support ticket",
        description: "Need help coordinating the pickup time.",
        status: "IN_PROGRESS",
        priority: "NORMAL",
        bookingId: booking.id,
        tripId: booking.tripId,
        assignedToUserId: support.id,
        firstResponseAt: new Date("2026-08-01T09:30:00.000Z"),
        slaDueAt: new Date("2026-08-01T17:00:00.000Z"),
        retentionUntil: new Date("2026-09-01T00:00:00.000Z"),
        participants: {
          create: [
            { userId: client.id, role: "REQUESTER" },
            { userId: support.id, role: "ASSIGNEE" },
          ],
        },
        messages: {
          create: [
            { senderUserId: client.id, text: "Need help coordinating the pickup time." },
            {
              senderUserId: support.id,
              text: "We contacted the driver and will monitor the trip.",
            },
          ],
        },
        internalNotes: {
          create: {
            authorUserId: support.id,
            text: "Seeded internal support note for admin workspace.",
          },
        },
        assignments: {
          create: {
            assigneeUserId: support.id,
            assignedByUserId: support.id,
            reason: "Seed fixture assignment",
          },
        },
        statusEvents: {
          create: [
            { actorUserId: client.id, toStatus: "NEW", reason: "Ticket opened" },
            {
              actorUserId: support.id,
              fromStatus: "NEW",
              toStatus: "IN_PROGRESS",
              reason: "Support started review",
            },
          ],
        },
      },
    });
  }
  const existingTimeline = await prisma.communicationTimelineEvent.findFirst({
    where: { ticketId: ticket.id, type: "SUPPORT_TICKET_SEEDED" },
  });
  if (!existingTimeline) {
    await prisma.communicationTimelineEvent.create({
      data: {
        ticketId: ticket.id,
        actorUserId: support.id,
        type: "SUPPORT_TICKET_SEEDED",
        payload: { seed: true },
      },
    });
  }
}

async function seedTrustSafetyFixtures() {
  const client = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000003n } });
  const driver = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000002n } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000001n } });
  const support = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000004n } });
  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: "phase6-booking-confirmed" },
  });
  const parcel = await prisma.parcelOrder.findFirstOrThrow({
    where: { id: "phase8-parcel-delivered" },
  });

  const criteria = [
    ["DRIVER_BY_CLIENT", "SAFETY", "Safety", true, 10],
    ["DRIVER_BY_CLIENT", "DRIVING_QUALITY", "Driving quality", true, 20],
    ["DRIVER_BY_CLIENT", "POLITENESS", "Politeness", false, 30],
    ["CLIENT_BY_DRIVER", "PUNCTUALITY", "Punctuality", true, 10],
    ["CLIENT_BY_DRIVER", "COMMUNICATION", "Communication", false, 20],
    ["PARCEL_DRIVER_BY_SENDER", "CAREFUL_HANDLING", "Careful handling", true, 10],
    ["PARCEL_DRIVER_BY_SENDER", "COMMUNICATION", "Communication", false, 20],
    ["PARCEL_SENDER_BY_DRIVER", "PACKAGING", "Packaging", true, 10],
    ["PARCEL_SENDER_BY_DRIVER", "ACCURATE_INFORMATION", "Accurate information", false, 20],
  ] as const;
  for (const [type, code, label, isRequired, sortOrder] of criteria) {
    await prisma.reviewCriterion.upsert({
      where: { type_code: { type, code } },
      create: { type, code, label, isRequired, sortOrder },
      update: { label, isRequired, sortOrder, isActive: true },
    });
  }

  let review = await prisma.review.findFirst({
    where: {
      type: "PARCEL_DRIVER_BY_SENDER",
      reviewerUserId: client.id,
      revieweeUserId: driver.id,
      parcelOrderId: parcel.id,
    },
  });
  if (!review) {
    review = await prisma.review.create({
      data: {
        type: "PARCEL_DRIVER_BY_SENDER",
        reviewerUserId: client.id,
        revieweeUserId: driver.id,
        parcelOrderId: parcel.id,
        tripId: parcel.tripId,
        overallRating: 5,
        text: "Careful parcel delivery and clear updates.",
        status: "PUBLISHED",
        submittedAt: new Date("2026-08-01T15:20:00.000Z"),
        publishedAt: new Date("2026-08-01T15:20:00.000Z"),
      },
    });
  } else {
    review = await prisma.review.update({
      where: { id: review.id },
      data: {
        overallRating: 5,
        status: "PUBLISHED",
        text: "Careful parcel delivery and clear updates.",
      },
    });
  }

  const scoreCriterion = await prisma.reviewCriterion.findUniqueOrThrow({
    where: { type_code: { type: "PARCEL_DRIVER_BY_SENDER", code: "CAREFUL_HANDLING" } },
  });
  await prisma.reviewCriterionScore.upsert({
    where: { reviewId_criterionId: { reviewId: review.id, criterionId: scoreCriterion.id } },
    create: { reviewId: review.id, criterionId: scoreCriterion.id, score: 5 },
    update: { score: 5 },
  });

  await prisma.ratingAggregate.upsert({
    where: { userId_scope: { userId: driver.id, scope: "PARCEL_DRIVER_BY_SENDER" } },
    create: {
      userId: driver.id,
      scope: "PARCEL_DRIVER_BY_SENDER",
      averageRating: 5,
      ratingCount: 1,
      ratingDistribution: { "5": 1 },
    },
    update: {
      averageRating: 5,
      ratingCount: 1,
      ratingDistribution: { "5": 1 },
      lastCalculatedAt: new Date(),
    },
  });

  await prisma.reliabilityEvent.upsert({
    where: { dedupeKey: "phase10:parcel-delivered:driver" },
    create: {
      userId: driver.id,
      type: "PARCEL_DELIVERED",
      parcelOrderId: parcel.id,
      weight: 2,
      dedupeKey: "phase10:parcel-delivered:driver",
      payload: { seed: true },
    },
    update: {},
  });
  await prisma.reliabilityProfile.upsert({
    where: { userId: driver.id },
    create: { userId: driver.id, parcelDeliveredCount: 1, reliabilityLevel: "RELIABLE" },
    update: { parcelDeliveredCount: 1, reliabilityLevel: "RELIABLE", lastCalculatedAt: new Date() },
  });

  const safetyReport = await prisma.safetyReport.upsert({
    where: { id: "phase10-safety-report-review" },
    create: {
      id: "phase10-safety-report-review",
      reporterUserId: client.id,
      reportedUserId: driver.id,
      type: "INAPPROPRIATE_CONTENT",
      severity: "LOW",
      status: "TRIAGED",
      description: "Seeded moderation report for review content.",
      reviewId: review.id,
      tripId: parcel.tripId,
    },
    update: { reviewId: review.id, status: "TRIAGED" },
  });
  await prisma.moderationCase.upsert({
    where: { sourceType_sourceId: { sourceType: "SafetyReport", sourceId: safetyReport.id } },
    create: {
      sourceType: "SafetyReport",
      sourceId: safetyReport.id,
      subjectUserId: driver.id,
      status: "OPEN",
      severity: "LOW",
      assigneeId: support.id,
    },
    update: { status: "OPEN", assigneeId: support.id },
  });
  const existingSafetyEvent = await prisma.safetyIncidentEvent.findFirst({
    where: { reportId: safetyReport.id, type: "SAFETY_REPORT_TRIAGED" },
  });
  if (!existingSafetyEvent) {
    await prisma.safetyIncidentEvent.create({
      data: {
        reportId: safetyReport.id,
        actorUserId: support.id,
        type: "SAFETY_REPORT_TRIAGED",
        payload: { seed: true },
      },
    });
  }

  const existingContact = await prisma.trustedContact.findFirst({
    where: { ownerUserId: client.id, phone: "+998901112233" },
  });
  if (existingContact) {
    await prisma.trustedContact.update({
      where: { id: existingContact.id },
      data: { displayName: "Phase 10 Trusted Contact", relationship: "Family", deletedAt: null },
    });
  } else {
    await prisma.trustedContact.create({
      data: {
        ownerUserId: client.id,
        displayName: "Phase 10 Trusted Contact",
        phone: "+998901112233",
        relationship: "Family",
      },
    });
  }

  await prisma.tripShare.upsert({
    where: { tokenHash: hashSecret("phase10-active-share") },
    create: {
      tripId: booking.tripId,
      bookingId: booking.id,
      ownerUserId: client.id,
      tokenHash: hashSecret("phase10-active-share"),
      expiresAt: new Date("2026-08-03T12:00:00.000Z"),
      label: "Phase 10 Trusted Contact",
    },
    update: { expiresAt: new Date("2026-08-03T12:00:00.000Z"), revokedAt: null },
  });

  let restriction = await prisma.accountRestriction.findFirst({
    where: { userId: driver.id, type: "CHAT_RESTRICTED", status: "ACTIVE" },
  });
  if (!restriction) {
    restriction = await prisma.accountRestriction.create({
      data: {
        userId: driver.id,
        type: "CHAT_RESTRICTED",
        reason: "Seeded trust and safety restriction.",
        createdByUserId: admin.id,
        endsAt: new Date("2026-08-04T12:00:00.000Z"),
      },
    });
  }
  const existingRestrictionEvent = await prisma.accountRestrictionEvent.findFirst({
    where: { restrictionId: restriction.id, type: "ACCOUNT_RESTRICTION_APPLIED" },
  });
  if (!existingRestrictionEvent) {
    await prisma.accountRestrictionEvent.create({
      data: {
        restrictionId: restriction.id,
        actorUserId: admin.id,
        type: "ACCOUNT_RESTRICTION_APPLIED",
        reason: "Seed fixture",
      },
    });
  }
}

async function seedPaymentsAnalyticsLaunchFixtures() {
  const client = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000003n } });
  const driver = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000002n } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { telegramId: 900000001n } });
  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: "phase6-booking-confirmed" },
  });
  const parcel = await prisma.parcelOrder.findFirstOrThrow({
    where: { id: "phase8-parcel-delivered" },
  });
  const driverProfile = await prisma.driverProfile.findFirstOrThrow({
    where: { userId: driver.id },
  });
  const metricDate = new Date("2026-08-03T00:00:00.000Z");

  const mockAccount = await prisma.paymentProviderAccount.upsert({
    where: { provider_displayName: { provider: "MOCK", displayName: "Local mock gateway" } },
    create: {
      provider: "MOCK",
      displayName: "Local mock gateway",
      config: { environment: "local", webhookSecretName: "MOCK_PAYMENT_WEBHOOK_SECRET" },
    },
    update: { isActive: true },
  });
  await prisma.paymentProviderAccount.upsert({
    where: {
      provider_displayName: { provider: "MANUAL", displayName: "Manual cash and bank operations" },
    },
    create: {
      provider: "MANUAL",
      displayName: "Manual cash and bank operations",
      config: { environment: "local", settlement: "driver-cash" },
    },
    update: { isActive: true },
  });

  await prisma.pricingRule.upsert({
    where: { code: "phase11-platform-fee-10pct" },
    create: {
      code: "phase11-platform-fee-10pct",
      targetType: "BOOKING",
      currency: "UZS",
      feeRateBps: 1000,
      payload: { description: "Seeded 10 percent platform fee" },
    },
    update: { isActive: true, feeRateBps: 1000 },
  });
  await prisma.promotionPlaceholder.upsert({
    where: { code: "PHASE11-LAUNCH" },
    create: {
      code: "PHASE11-LAUNCH",
      description: "Launch placeholder; discounts are not active in MVP.",
      isActive: false,
      payload: { enabledAfter: "post-launch" },
    },
    update: { isActive: false },
  });

  const existingSnapshot = await prisma.pricingSnapshot.findFirst({
    where: { targetType: "BOOKING", targetId: booking.id, ruleCode: "phase11-platform-fee-10pct" },
  });
  const pricingSnapshot =
    existingSnapshot ??
    (await prisma.pricingSnapshot.create({
      data: {
        targetType: "BOOKING",
        targetId: booking.id,
        currency: booking.currency,
        subtotalMinor: booking.totalMinor,
        feeMinor: booking.totalMinor / 10n,
        totalMinor: booking.totalMinor,
        ruleCode: "phase11-platform-fee-10pct",
        snapshot: { source: "seed", feeRateBps: 1000 },
      },
    }));

  const onlinePayment = await prisma.payment.upsert({
    where: { idempotencyKey: "phase11:booking:online:success" },
    create: {
      targetType: "BOOKING",
      bookingId: booking.id,
      payerUserId: client.id,
      payeeUserId: driver.id,
      method: "ONLINE",
      provider: "MOCK",
      status: "SUCCEEDED",
      currency: booking.currency,
      amountMinor: booking.totalMinor,
      paidMinor: booking.totalMinor,
      pricingSnapshotId: pricingSnapshot.id,
      idempotencyKey: "phase11:booking:online:success",
      succeededAt: new Date("2026-08-03T08:15:00.000Z"),
    },
    update: {
      status: "SUCCEEDED",
      paidMinor: booking.totalMinor,
      succeededAt: new Date("2026-08-03T08:15:00.000Z"),
    },
  });
  const onlineIntent = await prisma.paymentIntent.upsert({
    where: { idempotencyKey: "phase11:booking:online:intent" },
    create: {
      paymentId: onlinePayment.id,
      providerAccountId: mockAccount.id,
      provider: "MOCK",
      status: "SUCCEEDED",
      amountMinor: booking.totalMinor,
      currency: booking.currency,
      providerReference: `mock-${onlinePayment.id}`,
      clientAction: { type: "NONE" },
      idempotencyKey: "phase11:booking:online:intent",
      succeededAt: new Date("2026-08-03T08:15:00.000Z"),
    },
    update: { status: "SUCCEEDED", succeededAt: new Date("2026-08-03T08:15:00.000Z") },
  });
  const existingAttempt = await prisma.paymentAttempt.findFirst({
    where: { paymentIntentId: onlineIntent.id, providerReference: `mock-${onlinePayment.id}` },
  });
  if (!existingAttempt) {
    await prisma.paymentAttempt.create({
      data: {
        paymentIntentId: onlineIntent.id,
        providerAccountId: mockAccount.id,
        provider: "MOCK",
        status: "SUCCEEDED",
        providerReference: `mock-${onlinePayment.id}`,
        requestPayload: { seed: true },
        responsePayload: { status: "SUCCEEDED" },
      },
    });
  }
  await prisma.paymentWebhookEvent.upsert({
    where: { provider_eventId: { provider: "MOCK", eventId: "phase11-webhook-payment-succeeded" } },
    create: {
      provider: "MOCK",
      providerAccountId: mockAccount.id,
      paymentIntentId: onlineIntent.id,
      eventId: "phase11-webhook-payment-succeeded",
      eventType: "payment.succeeded",
      signatureValid: true,
      processedAt: new Date("2026-08-03T08:15:01.000Z"),
      payload: { providerReference: `mock-${onlinePayment.id}`, status: "SUCCEEDED" },
    },
    update: { processedAt: new Date("2026-08-03T08:15:01.000Z") },
  });

  const existingPlatformFee = await prisma.platformFee.findFirst({
    where: { paymentId: onlinePayment.id, rateBps: 1000 },
  });
  if (!existingPlatformFee) {
    await prisma.platformFee.create({
      data: {
        paymentId: onlinePayment.id,
        currency: booking.currency,
        amountMinor: booking.totalMinor / 10n,
        rateBps: 1000,
        ruleSnapshot: { code: "phase11-platform-fee-10pct" },
      },
    });
  }
  const existingEarning = await prisma.driverEarning.findFirst({
    where: { paymentId: onlinePayment.id, driverProfileId: driverProfile.id },
  });
  const earning = existingEarning
    ? await prisma.driverEarning.update({
        where: { id: existingEarning.id },
        data: { status: "AVAILABLE" },
      })
    : await prisma.driverEarning.create({
        data: {
          driverProfileId: driverProfile.id,
          paymentId: onlinePayment.id,
          bookingId: booking.id,
          status: "AVAILABLE",
          currency: booking.currency,
          grossMinor: booking.totalMinor,
          feeMinor: booking.totalMinor / 10n,
          netMinor: booking.totalMinor - booking.totalMinor / 10n,
          availableAt: new Date("2026-08-03T08:15:00.000Z"),
        },
      });
  await prisma.financialTransaction.upsert({
    where: { idempotencyKey: "phase11:booking:online:ledger" },
    create: {
      type: "PAYMENT",
      referenceType: "Payment",
      referenceId: onlinePayment.id,
      currency: booking.currency,
      amountMinor: booking.totalMinor,
      idempotencyKey: "phase11:booking:online:ledger",
      entries: {
        create: [
          {
            paymentId: onlinePayment.id,
            account: "provider_cash",
            entryType: "DEBIT",
            currency: booking.currency,
            amountMinor: booking.totalMinor,
          },
          {
            paymentId: onlinePayment.id,
            account: "platform_fee_revenue",
            entryType: "CREDIT",
            currency: booking.currency,
            amountMinor: booking.totalMinor / 10n,
          },
          {
            paymentId: onlinePayment.id,
            account: "driver_earnings_payable",
            entryType: "CREDIT",
            currency: booking.currency,
            amountMinor: booking.totalMinor - booking.totalMinor / 10n,
          },
        ],
      },
    },
    update: {},
  });

  const cashPayment = await prisma.payment.upsert({
    where: { idempotencyKey: "phase11:parcel:cash:declared" },
    create: {
      targetType: "PARCEL_ORDER",
      parcelOrderId: parcel.id,
      payerUserId: client.id,
      payeeUserId: driver.id,
      method: "CASH",
      provider: "MANUAL",
      status: "PROCESSING",
      currency: parcel.currency,
      amountMinor: parcel.priceMinor,
      idempotencyKey: "phase11:parcel:cash:declared",
    },
    update: { status: "PROCESSING" },
  });
  const existingDeclaration = await prisma.cashPaymentDeclaration.findFirst({
    where: { paymentId: cashPayment.id },
  });
  if (existingDeclaration) {
    await prisma.cashPaymentDeclaration.update({
      where: { id: existingDeclaration.id },
      data: { status: "DECLARED" },
    });
  } else {
    await prisma.cashPaymentDeclaration.create({
      data: {
        paymentId: cashPayment.id,
        parcelOrderId: parcel.id,
        declaredByUserId: client.id,
        status: "DECLARED",
        currency: parcel.currency,
        amountMinor: parcel.priceMinor,
      },
    });
  }
  const existingSettlement = await prisma.cashSettlement.findFirst({
    where: { paymentId: cashPayment.id, driverProfileId: driverProfile.id },
  });
  if (!existingSettlement) {
    await prisma.cashSettlement.create({
      data: {
        paymentId: cashPayment.id,
        driverProfileId: driverProfile.id,
        parcelOrderId: parcel.id,
        status: "OPEN",
        currency: parcel.currency,
        expectedMinor: parcel.priceMinor,
      },
    });
  }

  await prisma.paymentRefund.upsert({
    where: { idempotencyKey: "phase11:booking:refund:requested" },
    create: {
      paymentId: onlinePayment.id,
      requestedByUserId: client.id,
      reason: "CLIENT_CANCELLATION",
      status: "REQUESTED",
      currency: booking.currency,
      amountMinor: booking.totalMinor / 2n,
      idempotencyKey: "phase11:booking:refund:requested",
    },
    update: { status: "REQUESTED" },
  });
  const existingPayout = await prisma.driverPayout.findFirst({
    where: { provider: "MANUAL", providerReference: "phase11-payout-ready" },
  });
  if (existingPayout) {
    await prisma.driverPayout.update({
      where: { id: existingPayout.id },
      data: { status: "READY", grossMinor: earning.netMinor, itemCount: 1 },
    });
  } else {
    await prisma.driverPayout.create({
      data: {
        driverProfileId: driverProfile.id,
        provider: "MANUAL",
        status: "READY",
        currency: booking.currency,
        grossMinor: earning.netMinor,
        itemCount: 1,
        providerReference: "phase11-payout-ready",
        requestedByUserId: admin.id,
        items: {
          create: [
            { earningId: earning.id, currency: booking.currency, amountMinor: earning.netMinor },
          ],
        },
      },
    });
  }

  const existingReconciliation = await prisma.reconciliationRun.findFirst({
    where: {
      provider: "MOCK",
      OR: [
        { idempotencyKey: "phase11:reconciliation:mock:matched" },
        {
          createdByUserId: admin.id,
          summary: { path: ["source"], equals: "seed" },
        },
      ],
    },
  });
  if (existingReconciliation) {
    await prisma.reconciliationRun.update({
      where: { id: existingReconciliation.id },
      data: { idempotencyKey: "phase11:reconciliation:mock:matched" },
    });
  } else {
    await prisma.reconciliationRun.create({
      data: {
        provider: "MOCK",
        status: "MATCHED",
        idempotencyKey: "phase11:reconciliation:mock:matched",
        completedAt: new Date("2026-08-03T10:00:00.000Z"),
        createdByUserId: admin.id,
        summary: { payments: 1, mismatches: 0, source: "seed" },
        items: {
          create: [
            {
              status: "MATCHED",
              paymentId: onlinePayment.id,
              providerReference: `mock-${onlinePayment.id}`,
              expectedAmountMinor: booking.totalMinor,
              providerAmountMinor: booking.totalMinor,
              currency: booking.currency,
            },
          ],
        },
      },
    });
  }

  const events = [
    ["SEARCH_PERFORMED", "Trip", booking.tripId, "phase11:analytics:search"],
    ["TRIP_VIEWED", "Trip", booking.tripId, "phase11:analytics:trip-view"],
    ["PAYMENT_INTENT_CREATED", "Payment", onlinePayment.id, "phase11:analytics:intent"],
    ["PAYMENT_SUCCEEDED", "Payment", onlinePayment.id, "phase11:analytics:paid"],
    ["REFUND_REQUESTED", "Payment", onlinePayment.id, "phase11:analytics:refund"],
  ] as const;
  for (const [type, entityType, entityId, dedupeKey] of events) {
    await prisma.analyticsEvent.upsert({
      where: { dedupeKey },
      create: {
        type,
        actorUserId: client.id,
        entityType,
        entityId,
        dedupeKey,
        payload: { seed: true },
      },
      update: {},
    });
  }
  await prisma.dailyMetric.upsert({
    where: { metricDate_metricKey: { metricDate, metricKey: "payments.succeeded.count" } },
    create: { metricDate, metricKey: "payments.succeeded.count", value: 1n },
    update: { value: 1n },
  });
  await prisma.dailyMetric.upsert({
    where: { metricDate_metricKey: { metricDate, metricKey: "payments.gross.uzs_minor" } },
    create: { metricDate, metricKey: "payments.gross.uzs_minor", value: booking.totalMinor },
    update: { value: booking.totalMinor },
  });
  await prisma.funnelSnapshot.upsert({
    where: { snapshotDate_funnelKey: { snapshotDate: metricDate, funnelKey: "client_checkout" } },
    create: {
      snapshotDate: metricDate,
      funnelKey: "client_checkout",
      steps: [
        { step: "search", count: 8 },
        { step: "trip_detail", count: 5 },
        { step: "booking_started", count: 3 },
        { step: "payment_succeeded", count: 1 },
      ],
    },
    update: {
      steps: [
        { step: "search", count: 8 },
        { step: "trip_detail", count: 5 },
        { step: "booking_started", count: 3 },
        { step: "payment_succeeded", count: 1 },
      ],
    },
  });
  const existingExport = await prisma.reportExport.findFirst({
    where: { type: "daily-launch-report", storageKey: "reports/phase11/daily-launch-report.json" },
  });
  if (!existingExport) {
    await prisma.reportExport.create({
      data: {
        type: "daily-launch-report",
        status: "READY",
        requestedByUserId: admin.id,
        storageKey: "reports/phase11/daily-launch-report.json",
        filters: { date: metricDate.toISOString() },
        completedAt: new Date("2026-08-03T10:05:00.000Z"),
      },
    });
  }
  const existingAudit = await prisma.financialAuditEvent.findFirst({
    where: { type: "PHASE_11_SEED_COMPLETED", entityType: "Payment", entityId: onlinePayment.id },
  });
  if (!existingAudit) {
    await prisma.financialAuditEvent.create({
      data: {
        actorUserId: admin.id,
        type: "PHASE_11_SEED_COMPLETED",
        entityType: "Payment",
        entityId: onlinePayment.id,
        reason: "seed fixture",
        payload: { ledger: true, analytics: true },
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
