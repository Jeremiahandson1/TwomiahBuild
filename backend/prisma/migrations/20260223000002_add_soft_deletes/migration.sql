-- Add soft delete support to key models
ALTER TABLE "Contact"   ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Project"   ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Job"       ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Quote"     ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Invoice"   ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Expense"   ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Document"  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Vehicle"   ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Indexes for performance on soft delete queries
CREATE INDEX IF NOT EXISTS "Contact_deletedAt_idx"   ON "Contact"("deletedAt");
CREATE INDEX IF NOT EXISTS "Project_deletedAt_idx"   ON "Project"("deletedAt");
CREATE INDEX IF NOT EXISTS "Job_deletedAt_idx"       ON "Job"("deletedAt");
CREATE INDEX IF NOT EXISTS "Quote_deletedAt_idx"     ON "Quote"("deletedAt");
CREATE INDEX IF NOT EXISTS "Invoice_deletedAt_idx"   ON "Invoice"("deletedAt");
CREATE INDEX IF NOT EXISTS "Expense_deletedAt_idx"   ON "Expense"("deletedAt");
CREATE INDEX IF NOT EXISTS "Document_deletedAt_idx"  ON "Document"("deletedAt");
CREATE INDEX IF NOT EXISTS "Equipment_deletedAt_idx" ON "Equipment"("deletedAt");
CREATE INDEX IF NOT EXISTS "Vehicle_deletedAt_idx"   ON "Vehicle"("deletedAt");
