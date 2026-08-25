import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, test } from "vitest";

const runDbTests = Boolean(process.env.DATABASE_URL);
const prisma = runDbTests ? new PrismaClient() : null;

describe.runIf(runDbTests)("financial acceptance invariants", () => {
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  test("all seeded financial transactions are balanced", async () => {
    const transactions = await prisma!.financialTransaction.findMany({
      include: { entries: true },
    });
    expect(transactions.length).toBeGreaterThan(0);
    for (const transaction of transactions) {
      const debits = transaction.entries
        .filter((entry) => entry.entryType === "DEBIT")
        .reduce((sum, entry) => sum + entry.amountMinor, 0n);
      const credits = transaction.entries
        .filter((entry) => entry.entryType === "CREDIT")
        .reduce((sum, entry) => sum + entry.amountMinor, 0n);
      expect(debits, transaction.id).toBe(credits);
    }
  });

  test("duplicate finance records are rejected by database constraints", async () => {
    const payment = await prisma!.payment.findFirstOrThrow({ where: { status: "SUCCEEDED" } });
    await expect(
      prisma!.financialTransaction.create({
        data: {
          type: "PAYMENT",
          referenceType: "Payment",
          referenceId: payment.id,
          currency: payment.currency,
          amountMinor: payment.amountMinor,
          idempotencyKey: "phase11:booking:online:ledger",
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma!.paymentRefund.create({
        data: {
          paymentId: payment.id,
          reason: "CLIENT_CANCELLATION",
          status: "REQUESTED",
          currency: payment.currency,
          amountMinor: 1n,
          idempotencyKey: "phase11:booking:refund:requested",
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma!.driverEarning.create({
        data: {
          driverProfileId: "duplicate-check",
          paymentId: payment.id,
          currency: payment.currency,
          grossMinor: payment.amountMinor,
          netMinor: payment.amountMinor,
        },
      }),
    ).rejects.toThrow();
  });

  test("cash, payout, and reconciliation duplicate guards are active", async () => {
    const declaration = await prisma!.cashPaymentDeclaration.findFirstOrThrow({
      where: { paymentId: { not: null } },
    });
    await expect(
      prisma!.cashPaymentDeclaration.create({
        data: {
          paymentId: declaration.paymentId,
          declaredByUserId: declaration.declaredByUserId,
          currency: declaration.currency,
          amountMinor: declaration.amountMinor,
        },
      }),
    ).rejects.toThrow();

    const payoutItem = await prisma!.driverPayoutItem.findFirstOrThrow();
    await expect(
      prisma!.driverPayoutItem.create({
        data: {
          payoutId: payoutItem.payoutId,
          earningId: payoutItem.earningId,
          currency: payoutItem.currency,
          amountMinor: payoutItem.amountMinor,
        },
      }),
    ).rejects.toThrow();

    const run = await prisma!.reconciliationRun.findFirstOrThrow();
    await expect(
      prisma!.reconciliationRun.create({
        data: {
          provider: run.provider,
          status: "MATCHED",
          idempotencyKey: "phase11:reconciliation:mock:matched",
        },
      }),
    ).rejects.toThrow();
    const item = await prisma!.reconciliationItem.findFirstOrThrow({
      where: { providerReference: { not: null } },
    });
    await expect(
      prisma!.reconciliationItem.create({
        data: {
          runId: item.runId,
          providerReference: item.providerReference,
          status: "MATCHED",
          currency: item.currency,
        },
      }),
    ).rejects.toThrow();
  });
});
