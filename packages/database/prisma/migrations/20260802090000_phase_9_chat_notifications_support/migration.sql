CREATE TYPE "ConversationType" AS ENUM ('BOOKING', 'PARCEL', 'SUPPORT_ESCALATION', 'SYSTEM_ONLY');
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'CLOSED', 'RETAINED');
CREATE TYPE "ConversationParticipantRole" AS ENUM ('CLIENT', 'DRIVER', 'ADMIN_OBSERVER', 'SUPPORT_OBSERVER', 'SYSTEM');
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'LOCATION', 'SYSTEM', 'VOICE', 'FILE');
CREATE TYPE "ChatMessageStatus" AS ENUM ('CREATED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'DELETED', 'REPORTED');
CREATE TYPE "MessageReceiptStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');
CREATE TYPE "ModerationStatus" AS ENUM ('CLEAN', 'PENDING_REVIEW', 'REPORTED', 'HIDDEN');
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_REJECTED', 'BOOKING_CANCELLED', 'BOARDING_STARTED', 'BOARDING_CONFIRMED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'PARCEL_ACCEPTED', 'PARCEL_REJECTED', 'PARCEL_HANDED_OVER', 'PARCEL_IN_TRANSIT', 'PARCEL_READY', 'PARCEL_DELIVERED', 'PARCEL_ISSUE', 'CHAT_MESSAGE', 'SUPPORT_TICKET_UPDATED', 'SYSTEM_ANNOUNCEMENT');
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'TELEGRAM', 'EMAIL', 'SMS');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING', 'SKIPPED');
CREATE TYPE "SupportTicketType" AS ENUM ('BOOKING', 'TRIP', 'PARCEL', 'PAYMENT_PLACEHOLDER', 'ACCOUNT', 'DRIVER_VERIFICATION', 'VEHICLE', 'SAFETY', 'OTHER');
CREATE TYPE "SupportTicketStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'WAITING_FOR_USER', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED');
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "type" "ConversationType" NOT NULL,
  "bookingId" TEXT,
  "parcelOrderId" TEXT,
  "tripId" TEXT,
  "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastMessageAt" TIMESTAMP(3),
  "retentionUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationParticipant" (
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ConversationParticipantRole" NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "lastReadMessageId" TEXT,
  "lastReadAt" TIMESTAMP(3),
  "mutedUntil" TIMESTAMP(3),
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId", "userId")
);

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderUserId" TEXT,
  "type" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
  "status" "ChatMessageStatus" NOT NULL DEFAULT 'SENT',
  "text" TEXT,
  "locationLat" DECIMAL(9,6),
  "locationLng" DECIMAL(9,6),
  "locationLabel" TEXT,
  "replyToMessageId" TEXT,
  "clientMessageId" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "editedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'CLEAN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessageReceipt" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "status" "MessageReceiptStatus" NOT NULL DEFAULT 'SENT',
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatMessageReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "fileObjectId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'CHAT_ATTACHMENT',
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageReport" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "deepLink" TEXT,
  "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "deduplicationKey" TEXT NOT NULL,
  "templateVersion" TEXT NOT NULL DEFAULT 'phase9-v1',
  "payloadJson" JSONB,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "providerMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "version" TEXT NOT NULL DEFAULT 'phase9-v1',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "type" "SupportTicketType" NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'NEW',
  "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
  "bookingId" TEXT,
  "tripId" TEXT,
  "parcelOrderId" TEXT,
  "driverId" TEXT,
  "assignedToUserId" TEXT,
  "firstResponseAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "slaDueAt" TIMESTAMP(3),
  "retentionUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicketParticipant" ("ticketId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL, "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "leftAt" TIMESTAMP(3), CONSTRAINT "SupportTicketParticipant_pkey" PRIMARY KEY ("ticketId", "userId"));
CREATE TABLE "TicketMessage" ("id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "senderUserId" TEXT NOT NULL, "text" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "editedAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3), CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id"));
CREATE TABLE "TicketAttachment" ("id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "messageId" TEXT, "fileObjectId" TEXT, "originalFileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL, "checksum" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'UPLOADED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id"));
CREATE TABLE "TicketInternalNote" ("id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "authorUserId" TEXT NOT NULL, "text" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TicketInternalNote_pkey" PRIMARY KEY ("id"));
CREATE TABLE "TicketAssignment" ("id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "assigneeUserId" TEXT, "assignedByUserId" TEXT, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TicketAssignment_pkey" PRIMARY KEY ("id"));
CREATE TABLE "TicketStatusEvent" ("id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "actorUserId" TEXT, "fromStatus" "SupportTicketStatus", "toStatus" "SupportTicketStatus" NOT NULL, "reason" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TicketStatusEvent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SupportSlaPolicy" ("id" TEXT NOT NULL, "priority" "SupportPriority" NOT NULL, "firstResponseMinutes" INTEGER NOT NULL, "resolutionMinutes" INTEGER NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SupportSlaPolicy_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CommunicationTimelineEvent" ("id" TEXT NOT NULL, "conversationId" TEXT, "ticketId" TEXT, "actorUserId" TEXT, "type" TEXT NOT NULL, "payload" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CommunicationTimelineEvent_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "Conversation_bookingId_key" ON "Conversation"("bookingId");
CREATE UNIQUE INDEX "Conversation_parcelOrderId_key" ON "Conversation"("parcelOrderId");
CREATE INDEX "Conversation_type_status_lastMessageAt_idx" ON "Conversation"("type", "status", "lastMessageAt");
CREATE INDEX "Conversation_retentionUntil_idx" ON "Conversation"("retentionUntil");
CREATE INDEX "ConversationParticipant_userId_isArchived_updatedAt_idx" ON "ConversationParticipant"("userId", "isArchived", "updatedAt");
CREATE UNIQUE INDEX "ChatMessage_conversationId_clientMessageId_key" ON "ChatMessage"("conversationId", "clientMessageId");
CREATE INDEX "ChatMessage_conversationId_sentAt_idx" ON "ChatMessage"("conversationId", "sentAt");
CREATE INDEX "ChatMessage_senderUserId_sentAt_idx" ON "ChatMessage"("senderUserId", "sentAt");
CREATE UNIQUE INDEX "ChatMessageReceipt_messageId_recipientUserId_key" ON "ChatMessageReceipt"("messageId", "recipientUserId");
CREATE INDEX "ChatMessageReceipt_recipientUserId_status_idx" ON "ChatMessageReceipt"("recipientUserId", "status");
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");
CREATE INDEX "MessageAttachment_fileObjectId_idx" ON "MessageAttachment"("fileObjectId");
CREATE INDEX "MessageReport_conversationId_createdAt_idx" ON "MessageReport"("conversationId", "createdAt");
CREATE INDEX "MessageReport_status_createdAt_idx" ON "MessageReport"("status", "createdAt");
CREATE UNIQUE INDEX "Notification_deduplicationKey_key" ON "Notification"("deduplicationKey");
CREATE INDEX "Notification_recipientUserId_status_createdAt_idx" ON "Notification"("recipientUserId", "status", "createdAt");
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");
CREATE UNIQUE INDEX "NotificationDelivery_notificationId_channel_key" ON "NotificationDelivery"("notificationId", "channel");
CREATE INDEX "NotificationDelivery_status_channel_lastAttemptAt_idx" ON "NotificationDelivery"("status", "channel", "lastAttemptAt");
CREATE UNIQUE INDEX "NotificationTemplate_type_channel_version_key" ON "NotificationTemplate"("type", "channel", "version");
CREATE INDEX "SupportTicket_requesterUserId_status_updatedAt_idx" ON "SupportTicket"("requesterUserId", "status", "updatedAt");
CREATE INDEX "SupportTicket_status_priority_slaDueAt_idx" ON "SupportTicket"("status", "priority", "slaDueAt");
CREATE INDEX "SupportTicket_assignedToUserId_status_idx" ON "SupportTicket"("assignedToUserId", "status");
CREATE INDEX "SupportTicketParticipant_userId_idx" ON "SupportTicketParticipant"("userId");
CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");
CREATE INDEX "TicketAttachment_ticketId_idx" ON "TicketAttachment"("ticketId");
CREATE INDEX "TicketAttachment_messageId_idx" ON "TicketAttachment"("messageId");
CREATE INDEX "TicketInternalNote_ticketId_createdAt_idx" ON "TicketInternalNote"("ticketId", "createdAt");
CREATE INDEX "TicketAssignment_ticketId_createdAt_idx" ON "TicketAssignment"("ticketId", "createdAt");
CREATE INDEX "TicketAssignment_assigneeUserId_idx" ON "TicketAssignment"("assigneeUserId");
CREATE INDEX "TicketStatusEvent_ticketId_createdAt_idx" ON "TicketStatusEvent"("ticketId", "createdAt");
CREATE INDEX "TicketStatusEvent_toStatus_createdAt_idx" ON "TicketStatusEvent"("toStatus", "createdAt");
CREATE UNIQUE INDEX "SupportSlaPolicy_priority_key" ON "SupportSlaPolicy"("priority");
CREATE INDEX "CommunicationTimelineEvent_conversationId_createdAt_idx" ON "CommunicationTimelineEvent"("conversationId", "createdAt");
CREATE INDEX "CommunicationTimelineEvent_ticketId_createdAt_idx" ON "CommunicationTimelineEvent"("ticketId", "createdAt");
CREATE INDEX "CommunicationTimelineEvent_type_createdAt_idx" ON "CommunicationTimelineEvent"("type", "createdAt");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_parcelOrderId_fkey" FOREIGN KEY ("parcelOrderId") REFERENCES "ParcelOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatMessageReceipt" ADD CONSTRAINT "ChatMessageReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessageReceipt" ADD CONSTRAINT "ChatMessageReceipt_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_parcelOrderId_fkey" FOREIGN KEY ("parcelOrderId") REFERENCES "ParcelOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicketParticipant" ADD CONSTRAINT "SupportTicketParticipant_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketParticipant" ADD CONSTRAINT "SupportTicketParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketInternalNote" ADD CONSTRAINT "TicketInternalNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketInternalNote" ADD CONSTRAINT "TicketInternalNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketStatusEvent" ADD CONSTRAINT "TicketStatusEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketStatusEvent" ADD CONSTRAINT "TicketStatusEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunicationTimelineEvent" ADD CONSTRAINT "CommunicationTimelineEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationTimelineEvent" ADD CONSTRAINT "CommunicationTimelineEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
