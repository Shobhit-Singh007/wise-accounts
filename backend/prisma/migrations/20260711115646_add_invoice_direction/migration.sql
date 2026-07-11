-- CreateEnum
CREATE TYPE "InvoiceDirection" AS ENUM ('SALE', 'PURCHASE');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "direction" "InvoiceDirection" NOT NULL DEFAULT 'SALE',
ADD COLUMN     "supplierId" TEXT;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
