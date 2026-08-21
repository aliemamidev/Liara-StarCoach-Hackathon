-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('ADMIN', 'DOCS', 'WEB');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('PENDING', 'ANSWERED', 'CLOSED');

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "normalizedQuestion" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sourceType" "KnowledgeSourceType" NOT NULL DEFAULT 'ADMIN',
    "sourceRefs" JSONB NOT NULL DEFAULT '[]',
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationTicket" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userQuestion" TEXT NOT NULL,
    "clarifiedQuestion" TEXT NOT NULL,
    "conversationSnapshot" JSONB NOT NULL,
    "attachmentsSnapshot" JSONB NOT NULL,
    "searchTrace" JSONB NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'PENDING',
    "adminAnswer" TEXT,
    "answeredById" TEXT,
    "answeredAt" TIMESTAMP(3),
    "knowledgeEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeEntry_normalizedQuestion_idx" ON "KnowledgeEntry"("normalizedQuestion");
CREATE INDEX "KnowledgeEntry_isActive_idx" ON "KnowledgeEntry"("isActive");
CREATE INDEX "KnowledgeEntry_sourceType_idx" ON "KnowledgeEntry"("sourceType");
CREATE INDEX "EscalationTicket_chatId_status_idx" ON "EscalationTicket"("chatId", "status");
CREATE INDEX "EscalationTicket_status_updatedAt_idx" ON "EscalationTicket"("status", "updatedAt");
CREATE INDEX "EscalationTicket_knowledgeEntryId_idx" ON "EscalationTicket"("knowledgeEntryId");

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EscalationTicket" ADD CONSTRAINT "EscalationTicket_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscalationTicket" ADD CONSTRAINT "EscalationTicket_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EscalationTicket" ADD CONSTRAINT "EscalationTicket_knowledgeEntryId_fkey" FOREIGN KEY ("knowledgeEntryId") REFERENCES "KnowledgeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
