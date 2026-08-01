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
  "trip:read-admin",
  "trip:block",
  "trip:unblock",
  "trip:cancel-admin",
  "trip:audit-read",
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
  await seedTripSupplyFixtures();

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

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
