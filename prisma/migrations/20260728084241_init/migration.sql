-- CreateEnum
CREATE TYPE "PlanId" AS ENUM ('starter', 'professional', 'enterprise');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'trial', 'suspended', 'churned');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Owner', 'Admin', 'Manager', 'Cashier', 'Driver');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'invited', 'disabled');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "plan" "PlanId" NOT NULL,
    "status" "TenantStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "branches" INTEGER NOT NULL DEFAULT 1,
    "seatsUsed" INTEGER NOT NULL DEFAULT 0,
    "storageUsedMB" INTEGER NOT NULL DEFAULT 0,
    "monthlyOrders" INTEGER NOT NULL DEFAULT 0,
    "mrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "featureOverrides" JSONB NOT NULL DEFAULT '{}',
    "taxEnabled" BOOLEAN NOT NULL DEFAULT false,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "logoUrl" TEXT,
    "trn" TEXT,
    "address" TEXT,
    "receiptNote" TEXT,
    "paymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deliveryTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hangFoldOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "placements" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "department" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "passwordHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "moduleOverrides" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TenantUser_username_key" ON "TenantUser"("username");

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
