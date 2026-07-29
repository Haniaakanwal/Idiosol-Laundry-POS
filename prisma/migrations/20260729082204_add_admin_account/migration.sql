-- CreateTable
CREATE TABLE "AdminAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mustReset" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AdminAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminAccount_email_key" ON "AdminAccount"("email");
