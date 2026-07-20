import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('Connected to database');

    const result = await prisma.$executeRawUnsafe(`
      UPDATE "Invoice" 
      SET "invoiceDate" = "createdAt" 
      WHERE "invoiceDate" IS NULL
    `);

    console.log(`Backfill complete. ${result} invoices updated.`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
