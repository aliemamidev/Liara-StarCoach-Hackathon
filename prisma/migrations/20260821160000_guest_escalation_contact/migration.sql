ALTER TABLE "EscalationTicket"
ADD COLUMN "guestName" TEXT,
ADD COLUMN "guestPhone" TEXT;

CREATE INDEX "EscalationTicket_guestPhone_idx" ON "EscalationTicket"("guestPhone");
