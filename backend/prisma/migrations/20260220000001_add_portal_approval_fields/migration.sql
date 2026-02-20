-- Quote: add portal approval/rejection fields
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "approvedBy"      TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "signedBy"        TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "approvalNotes"   TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "approvalIp"      TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "validUntil"      TIMESTAMP(3);

-- ChangeOrder: add portal approval/signature/rejection fields
ALTER TABLE "ChangeOrder" ADD COLUMN IF NOT EXISTS "signature"       TEXT;
ALTER TABLE "ChangeOrder" ADD COLUMN IF NOT EXISTS "signedBy"        TEXT;
ALTER TABLE "ChangeOrder" ADD COLUMN IF NOT EXISTS "signedAt"        TIMESTAMP(3);
ALTER TABLE "ChangeOrder" ADD COLUMN IF NOT EXISTS "approvalNotes"   TEXT;
ALTER TABLE "ChangeOrder" ADD COLUMN IF NOT EXISTS "approvalIp"      TEXT;
ALTER TABLE "ChangeOrder" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "ChangeOrder" ADD COLUMN IF NOT EXISTS "rejectedAt"      TIMESTAMP(3);
