-- Launch acceptance integrity constraints for finance idempotency and duplicate protection.
ALTER TABLE "ReconciliationRun" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformFee_paymentId_key" ON "PlatformFee"("paymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "DriverEarning_paymentId_key" ON "DriverEarning"("paymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReconciliationRun_idempotencyKey_key" ON "ReconciliationRun"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "ReconciliationItem_runId_providerReference_key" ON "ReconciliationItem"("runId", "providerReference");
CREATE UNIQUE INDEX IF NOT EXISTS "CashPaymentDeclaration_paymentId_key" ON "CashPaymentDeclaration"("paymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "CashSettlement_paymentId_driverProfileId_key" ON "CashSettlement"("paymentId", "driverProfileId");
