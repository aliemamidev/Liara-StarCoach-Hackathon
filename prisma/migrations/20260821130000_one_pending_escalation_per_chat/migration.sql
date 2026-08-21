CREATE UNIQUE INDEX "EscalationTicket_one_pending_per_chat"
ON "EscalationTicket" ("chatId")
WHERE "status" = 'PENDING';
