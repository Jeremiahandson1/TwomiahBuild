-- AlterTable: add storageType to FactoryBuild
ALTER TABLE "FactoryBuild" ADD COLUMN IF NOT EXISTS "storageType" TEXT NOT NULL DEFAULT 'local';
