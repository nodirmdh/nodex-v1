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
  await seedDriverVerificationFixtures();
  await seedVehicleFixtures();

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

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
