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

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
