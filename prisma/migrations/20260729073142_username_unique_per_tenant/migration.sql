/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,username]` on the table `TenantUser` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TenantUser_username_key";

-- CreateIndex
CREATE UNIQUE INDEX "TenantUser_tenantId_username_key" ON "TenantUser"("tenantId", "username");
