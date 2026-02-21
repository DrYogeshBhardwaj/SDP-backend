-- CreateIndex
CREATE INDEX "BonusLedger_createdAt_idx" ON "BonusLedger"("createdAt");

-- CreateIndex
CREATE INDEX "BonusLedger_userId_idx" ON "BonusLedger"("userId");

-- CreateIndex
CREATE INDEX "Payout_requested_at_idx" ON "Payout"("requested_at");

-- CreateIndex
CREATE INDEX "Payout_userId_idx" ON "Payout"("userId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "SystemExpense_date_idx" ON "SystemExpense"("date");

-- CreateIndex
CREATE INDEX "SystemExpense_adminId_idx" ON "SystemExpense"("adminId");

-- CreateIndex
CREATE INDEX "Transaction_transactionDate_idx" ON "Transaction"("transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
