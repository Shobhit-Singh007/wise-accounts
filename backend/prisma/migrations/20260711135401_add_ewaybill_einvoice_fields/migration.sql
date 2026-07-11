-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "ackDate" TIMESTAMP(3),
ADD COLUMN     "ackNo" TEXT,
ADD COLUMN     "distanceKm" INTEGER,
ADD COLUMN     "docType" TEXT DEFAULT 'Tax Invoice',
ADD COLUMN     "ewayBillDate" TIMESTAMP(3),
ADD COLUMN     "irn" TEXT,
ADD COLUMN     "irnDate" TIMESTAMP(3),
ADD COLUMN     "qrCode" TEXT,
ADD COLUMN     "supplyType" TEXT DEFAULT 'Regular',
ADD COLUMN     "transporterId" TEXT,
ADD COLUMN     "transporterName" TEXT,
ADD COLUMN     "valueOfGoods" DOUBLE PRECISION,
ADD COLUMN     "vehicleNo" TEXT;
