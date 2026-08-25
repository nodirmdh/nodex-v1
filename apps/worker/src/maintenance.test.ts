import { describe, expect, it, vi } from "vitest";
import { expireStaleOnlinePayments, releaseActiveWorkerSeatHold } from "./maintenance";

describe("worker maintenance reliability regressions", () => {
  it("expires only stale online payments", async () => {
    const now = new Date("2026-08-25T10:00:00.000Z");
    const onlinePayment = {
      id: "payment-online-old",
      bookingId: null,
      method: "ONLINE",
      status: "PROCESSING",
    };
    const tx = {
      payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      paymentIntent: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      financialAuditEvent: { create: vi.fn().mockResolvedValue({}) },
      seatHold: { findFirst: vi.fn() },
      booking: { updateMany: vi.fn() },
      bookingTimelineEvent: { create: vi.fn() },
    };
    const prisma = {
      payment: { findMany: vi.fn().mockResolvedValue([onlinePayment]) },
      $transaction: vi.fn(async (callback) => callback(tx)),
      seatHold: { findMany: vi.fn() },
    };

    await expect(expireStaleOnlinePayments(prisma as never, now)).resolves.toBe(1);
    expect(prisma.payment.findMany).toHaveBeenCalledWith({
      where: {
        method: "ONLINE",
        status: { in: ["CREATED", "REQUIRES_ACTION", "PROCESSING"] },
        createdAt: { lt: new Date("2026-08-25T09:30:00.000Z") },
      },
      take: 50,
    });
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-online-old",
        method: "ONLINE",
        status: { in: ["CREATED", "REQUIRES_ACTION", "PROCESSING"] },
      },
      data: { status: "EXPIRED", failedAt: now },
    });
  });

  it("releases only seats owned by the exact active hold", async () => {
    const now = new Date("2026-08-25T10:00:00.000Z");
    const tx = {
      seatHold: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      tripSeat: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
      bookingSeat: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    const released = await releaseActiveWorkerSeatHold(
      tx as never,
      {
        id: "hold-a",
        version: 7,
        bookingId: "booking-a",
        items: [{ tripSeatId: "seat-1" }, { tripSeatId: "seat-2" }],
      } as never,
      now,
    );

    expect(released).toBe(true);
    expect(tx.seatHold.updateMany).toHaveBeenCalledWith({
      where: { id: "hold-a", status: "ACTIVE", version: 7 },
      data: { status: "EXPIRED", releasedAt: now, version: { increment: 1 } },
    });
    expect(tx.tripSeat.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["seat-1", "seat-2"] }, status: "HELD" },
      data: { status: "AVAILABLE", version: { increment: 1 } },
    });
    expect(tx.bookingSeat.updateMany).toHaveBeenCalledWith({
      where: { bookingId: "booking-a", tripSeatId: { in: ["seat-1", "seat-2"] }, status: "HELD" },
      data: { status: "RELEASED" },
    });
  });

  it("does not release seats when stale cleanup cannot claim the active hold", async () => {
    const tx = {
      seatHold: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      tripSeat: { updateMany: vi.fn() },
      bookingSeat: { updateMany: vi.fn() },
    };
    const released = await releaseActiveWorkerSeatHold(
      tx as never,
      {
        id: "hold-a",
        version: 1,
        bookingId: "booking-a",
        items: [{ tripSeatId: "seat-1" }],
      } as never,
      new Date("2026-08-25T10:00:00.000Z"),
    );

    expect(released).toBe(false);
    expect(tx.tripSeat.updateMany).not.toHaveBeenCalled();
    expect(tx.bookingSeat.updateMany).not.toHaveBeenCalled();
  });
});
