-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "recurringInvoiceId" TEXT;

-- CreateTable
CREATE TABLE "RecurringInvoice" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "templateName" TEXT,
    "frequency" TEXT NOT NULL,
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "lastRunDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "matchedAmount" DOUBLE PRECISION NOT NULL,
    "matchType" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "reconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringInvoice_businessId_idx" ON "RecurringInvoice"("businessId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_nextRunDate_idx" ON "RecurringInvoice"("nextRunDate");

-- CreateIndex
CREATE INDEX "ReconciliationLog_businessId_idx" ON "ReconciliationLog"("businessId");

-- CreateIndex
CREATE INDEX "ReconciliationLog_paymentId_idx" ON "ReconciliationLog"("paymentId");

-- CreateIndex
CREATE INDEX "Notification_businessId_idx" ON "Notification"("businessId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_businessId_isRead_idx" ON "Notification"("businessId", "isRead");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_recurringInvoiceId_fkey" FOREIGN KEY ("recurringInvoiceId") REFERENCES "RecurringInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
