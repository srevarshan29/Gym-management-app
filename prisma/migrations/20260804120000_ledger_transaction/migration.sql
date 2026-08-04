-- CreateEnum
CREATE TYPE "LedgerTransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "type" "LedgerTransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "occurredOn" DATE NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerTransaction_gymId_idx" ON "LedgerTransaction"("gymId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_gymId_occurredOn_idx" ON "LedgerTransaction"("gymId", "occurredOn");

-- CreateIndex
CREATE INDEX "LedgerTransaction_gymId_type_idx" ON "LedgerTransaction"("gymId", "type");

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LedgerTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerTransaction" FORCE ROW LEVEL SECURITY;

CREATE POLICY ledger_transaction_tenant_all ON "LedgerTransaction" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());
