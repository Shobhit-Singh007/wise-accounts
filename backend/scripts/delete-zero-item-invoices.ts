import { PrismaClient } from '@prisma/client';

async function main() {
  const businessId = process.argv[2];
  if (!businessId) {
    console.error('Usage: npx ts-node scripts/delete-zero-item-invoices.ts <businessId>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  await prisma.$connect();

  const invoices = await prisma.invoice.findMany({
    where: { businessId },
    include: { _count: { select: { items: true } } },
  });

  const toDelete = invoices.filter(inv => inv._count.items === 0);
  console.log(`Found ${toDelete.length} invoices with zero items`);

  for (const inv of toDelete) {
    await prisma.$transaction([
      prisma.reconciliationLog.deleteMany({ where: { invoiceId: inv.id } }),
      prisma.razorpayOrder.deleteMany({ where: { invoiceId: inv.id } }),
      prisma.creditNote.deleteMany({ where: { invoiceId: inv.id } }),
      prisma.payment.deleteMany({ where: { invoiceId: inv.id } }),
      prisma.invoiceItem.deleteMany({ where: { invoiceId: inv.id } }),
      prisma.invoice.delete({ where: { id: inv.id } }),
    ]);
    console.log(`Deleted invoice ${inv.invoiceNo} (${inv.id})`);
  }

  console.log(`Done. Deleted ${toDelete.length} invoices.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
