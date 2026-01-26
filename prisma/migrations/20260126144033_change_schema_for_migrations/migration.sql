-- CreateEnum
CREATE TYPE "FormResponseStatus" AS ENUM ('STARTED', 'COMPLETED', 'ABANDONED');

-- DropIndex
DROP INDEX "FormResponseField_fieldName_idx";

-- AlterTable
ALTER TABLE "FormResponse" ADD COLUMN     "browser" TEXT,
ADD COLUMN     "channel" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "locale" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "os" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "FormResponseStatus" NOT NULL DEFAULT 'STARTED',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT;

-- AlterTable
ALTER TABLE "FormResponseField" ADD COLUMN     "fieldId" INTEGER,
ADD COLUMN     "valueBool" BOOLEAN,
ADD COLUMN     "valueDate" TIMESTAMP(3),
ADD COLUMN     "valueJson" JSONB,
ADD COLUMN     "valueNumber" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "FormResponse_projetoId_createdAt_idx" ON "FormResponse"("projetoId", "createdAt");

-- CreateIndex
CREATE INDEX "FormResponse_formVersionId_createdAt_idx" ON "FormResponse"("formVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "FormResponse_projetoId_status_createdAt_idx" ON "FormResponse"("projetoId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FormResponseField_fieldName_value_idx" ON "FormResponseField"("fieldName", "value");

-- CreateIndex
CREATE INDEX "FormResponseField_responseId_idx" ON "FormResponseField"("responseId");

-- CreateIndex
CREATE INDEX "FormResponseField_fieldId_idx" ON "FormResponseField"("fieldId");

-- CreateIndex
CREATE INDEX "FormResponseField_fieldId_valueNumber_idx" ON "FormResponseField"("fieldId", "valueNumber");

-- CreateIndex
CREATE INDEX "FormResponseField_fieldId_valueDate_idx" ON "FormResponseField"("fieldId", "valueDate");

-- AddForeignKey
ALTER TABLE "FormResponseField" ADD CONSTRAINT "FormResponseField_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField"("id") ON DELETE SET NULL ON UPDATE CASCADE;
