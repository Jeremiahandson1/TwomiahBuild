-- CreateTable
CREATE TABLE "FactoryCustomer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "domain" TEXT,
    "industry" TEXT,
    "products" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "logo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "deployedUrl" TEXT,
    "apiUrl" TEXT,
    "siteUrl" TEXT,
    "billingType" TEXT,
    "billingStatus" TEXT NOT NULL DEFAULT 'pending',
    "planId" TEXT,
    "monthlyAmount" DECIMAL(10,2),
    "oneTimeAmount" DECIMAL(10,2),
    "paidAt" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "notes" TEXT,
    "buildId" TEXT,
    "adminEmail" TEXT,
    "adminPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactoryCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactoryBuild" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "products" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "config" JSONB,
    "zipPath" TEXT,
    "zipName" TEXT,
    "buildId" TEXT NOT NULL,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactoryBuild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FactoryCustomer_companyId_idx" ON "FactoryCustomer"("companyId");

-- CreateIndex
CREATE INDEX "FactoryCustomer_status_idx" ON "FactoryCustomer"("status");

-- CreateIndex
CREATE INDEX "FactoryCustomer_billingStatus_idx" ON "FactoryCustomer"("billingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "FactoryBuild_buildId_key" ON "FactoryBuild"("buildId");

-- CreateIndex
CREATE INDEX "FactoryBuild_companyId_idx" ON "FactoryBuild"("companyId");

-- CreateIndex
CREATE INDEX "FactoryBuild_customerId_idx" ON "FactoryBuild"("customerId");

-- AddForeignKey
ALTER TABLE "FactoryCustomer" ADD CONSTRAINT "FactoryCustomer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactoryBuild" ADD CONSTRAINT "FactoryBuild_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactoryBuild" ADD CONSTRAINT "FactoryBuild_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "FactoryCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
