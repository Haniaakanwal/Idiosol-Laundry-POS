-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('signup', 'upgrade', 'downgrade', 'suspend', 'reactivate', 'invite', 'payment', 'login');

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "message" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);
