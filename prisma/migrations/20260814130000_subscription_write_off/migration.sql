-- Outstanding prior-cycle dues: write-off is stored on the subscription, not as a payment.

ALTER TABLE "Subscription" ADD COLUMN "writtenOffAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN "writtenOffAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "writtenOffById" TEXT;

CREATE INDEX "Subscription_writtenOffById_idx" ON "Subscription"("writtenOffById");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_writtenOffById_fkey"
  FOREIGN KEY ("writtenOffById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
