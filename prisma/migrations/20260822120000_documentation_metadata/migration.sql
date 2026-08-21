ALTER TABLE "KnowledgeDocument"
  ADD COLUMN "category" TEXT,
  ADD COLUMN "service" TEXT,
  ADD COLUMN "documentType" TEXT;

CREATE INDEX "KnowledgeDocument_category_service_idx" ON "KnowledgeDocument"("category", "service");
