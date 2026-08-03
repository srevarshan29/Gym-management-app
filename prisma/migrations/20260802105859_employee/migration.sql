-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "joiningDate" DATE NOT NULL,
    "salary" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employee_gymId_idx" ON "Employee"("gymId");

-- CreateIndex
CREATE INDEX "Employee_gymId_name_idx" ON "Employee"("gymId", "name");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
