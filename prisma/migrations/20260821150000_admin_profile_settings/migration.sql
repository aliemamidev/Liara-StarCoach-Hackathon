ALTER TABLE "User"
ADD COLUMN "phone" TEXT,
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "captureUnknownTopics" BOOLEAN NOT NULL DEFAULT true,
    "notifyFailures" BOOLEAN NOT NULL DEFAULT true,
    "webSearchEnabled" BOOLEAN NOT NULL DEFAULT true,
    "probableAnswersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoEscalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id")
);
