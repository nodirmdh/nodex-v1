import { describe, expect, it } from "vitest";
import {
  bookingChatEligible,
  calculateSlaDueAt,
  chatMessageSchema,
  createConversationSchema,
  evaluateSupportTransition,
  notificationCreateSchema,
  parcelChatEligible,
  supportAttachmentMetadataSchema,
  supportTicketCreateSchema,
  supportTicketMessageSchema,
} from "./index";

describe("conversation eligibility", () => {
  const now = new Date("2026-08-02T09:00:00.000Z");

  it("allows active booking and retained completed booking chats", () => {
    expect(bookingChatEligible("CONFIRMED", null, now)).toBe(true);
    expect(bookingChatEligible("COMPLETED", new Date("2026-08-03T09:00:00.000Z"), now)).toBe(true);
    expect(bookingChatEligible("CANCELLED_BY_CLIENT", null, now)).toBe(false);
  });

  it("allows active parcel and retained delivered parcel chats", () => {
    expect(parcelChatEligible("ACCEPTED", null, now)).toBe(true);
    expect(parcelChatEligible("DELIVERED", new Date("2026-08-03T09:00:00.000Z"), now)).toBe(true);
    expect(parcelChatEligible("DRAFT", null, now)).toBe(false);
  });

  it("requires exactly one entity when creating a conversation", () => {
    expect(createConversationSchema.parse({ bookingId: "booking-1" }).bookingId).toBe("booking-1");
    expect(() => createConversationSchema.parse({})).toThrow();
    expect(() =>
      createConversationSchema.parse({ bookingId: "booking-1", parcelOrderId: "parcel-1" }),
    ).toThrow();
  });
});

describe("chat messages", () => {
  it("accepts text and location messages", () => {
    expect(
      chatMessageSchema.parse({
        clientMessageId: "client-1",
        type: "TEXT",
        text: "I am near the station",
      }),
    ).toMatchObject({ clientMessageId: "client-1", type: "TEXT" });

    expect(
      chatMessageSchema.parse({
        clientMessageId: "client-2",
        type: "LOCATION",
        locationLat: 41.31,
        locationLng: 69.28,
      }),
    ).toMatchObject({ type: "LOCATION" });
  });

  it("rejects empty text, invalid location, and disabled voice messages", () => {
    expect(() => chatMessageSchema.parse({ clientMessageId: "x", type: "TEXT" })).toThrow();
    expect(() =>
      chatMessageSchema.parse({ clientMessageId: "x", type: "LOCATION", locationLat: 10 }),
    ).toThrow();
    expect(() => chatMessageSchema.parse({ clientMessageId: "x", type: "VOICE" })).toThrow();
  });
});

describe("notifications", () => {
  it("requires a deduplication key and safe text", () => {
    expect(
      notificationCreateSchema.parse({
        recipientUserId: "user-1",
        type: "CHAT_MESSAGE",
        title: "New message",
        body: "Driver replied",
        deduplicationKey: "chat-message-1-user-1",
      }),
    ).toMatchObject({ type: "CHAT_MESSAGE" });
  });
});

describe("support tickets", () => {
  it("validates ticket creation", () => {
    expect(
      supportTicketCreateSchema.parse({
        type: "PARCEL",
        subject: "Parcel pickup question",
        description: "Recipient cannot reach the pickup point.",
        priority: "NORMAL",
      }),
    ).toMatchObject({ type: "PARCEL" });
  });

  it("validates replies and safe attachment metadata", () => {
    expect(
      supportTicketMessageSchema.parse({
        text: "I can share a photo from pickup.",
        replyToMessageId: "message-1",
      }),
    ).toMatchObject({ replyToMessageId: "message-1" });

    expect(
      supportAttachmentMetadataSchema.parse({
        messageId: "message-1",
        storageKey: "support/ticket-1/photo.webp",
        originalFileName: "pickup-photo.webp",
        mimeType: "image/webp",
        sizeBytes: 120_000,
        checksum: "sha256-photo",
      }),
    ).toMatchObject({ mimeType: "image/webp" });
  });

  it("rejects unsafe support attachment metadata", () => {
    expect(() =>
      supportAttachmentMetadataSchema.parse({
        originalFileName: "run.exe",
        mimeType: "application/x-msdownload",
        sizeBytes: 120_000,
        checksum: "sha256-file",
      }),
    ).toThrow();
    expect(() =>
      supportAttachmentMetadataSchema.parse({
        originalFileName: "huge.mp4",
        mimeType: "video/mp4",
        sizeBytes: 25 * 1024 * 1024,
        checksum: "sha256-file",
      }),
    ).toThrow();
  });

  it("evaluates support transitions and SLA due dates", () => {
    expect(evaluateSupportTransition("NEW", "START_PROGRESS")).toMatchObject({
      ok: true,
      toStatus: "IN_PROGRESS",
    });
    expect(evaluateSupportTransition("CLOSED", "RESOLVE")).toMatchObject({
      ok: false,
      code: "SUPPORT_INVALID_TRANSITION",
    });
    expect(calculateSlaDueAt("URGENT", new Date("2026-08-02T09:00:00.000Z")).toISOString()).toBe(
      "2026-08-02T09:30:00.000Z",
    );
  });
});
