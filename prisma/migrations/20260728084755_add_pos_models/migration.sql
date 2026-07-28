-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Draft', 'Job Order', 'Ready', 'Delivered', 'Cancelled');

-- CreateEnum
CREATE TYPE "CreditAddMethod" AS ENUM ('Cash', 'Card', 'EFT');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('sent', 'failed');

-- CreateTable
CREATE TABLE "Plan" (
    "id" "PlanId" NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "blurb" TEXT NOT NULL,
    "seatLimit" INTEGER,
    "branchLimit" INTEGER,
    "storageLimitMB" INTEGER NOT NULL,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POSCustomer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isBlacklist" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "POSCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "CreditAddMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CreditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POSService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameArabic" TEXT,
    "category" TEXT NOT NULL,
    "prices" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "POSService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POSOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "orderTime" TEXT,
    "deliveryType" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "pickupTime" TEXT,
    "placement" TEXT,
    "status" "OrderStatus" NOT NULL,
    "sub" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION,
    "tax" DOUBLE PRECISION,
    "total" DOUBLE PRECISION NOT NULL,
    "paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salesman" TEXT NOT NULL,
    "driver" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "POSOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POSOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "hangFold" TEXT NOT NULL,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "nasha" TEXT NOT NULL DEFAULT 'None',
    "placement" TEXT,
    "lineTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "POSOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POSPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "ref" TEXT,

    CONSTRAINT "POSPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "text" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MessageStatus" NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreditLog" ADD CONSTRAINT "CreditLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "POSCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSOrder" ADD CONSTRAINT "POSOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "POSCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSOrderItem" ADD CONSTRAINT "POSOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "POSOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSPayment" ADD CONSTRAINT "POSPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "POSOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "POSCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "POSOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
