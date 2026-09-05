ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "requesterRole" TEXT NOT NULL DEFAULT 'CLIENT';
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "replyToMessageId" TEXT;
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SENT';
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "TicketMessage_replyToMessageId_idx" ON "TicketMessage"("replyToMessageId");
CREATE INDEX IF NOT EXISTS "TicketAttachment_fileObjectId_idx" ON "TicketAttachment"("fileObjectId");

ALTER TABLE "TicketMessage"
  ADD CONSTRAINT "TicketMessage_replyToMessageId_fkey"
  FOREIGN KEY ("replyToMessageId") REFERENCES "TicketMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;