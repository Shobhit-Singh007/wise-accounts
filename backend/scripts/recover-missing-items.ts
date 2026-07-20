import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('Connected');

  const invoices = await prisma.invoice.findMany({
    where: { grandTotal: { gt: 0 } },
    include: { _count: { select: { items: true } } },
  });

  let fixed = 0;
  for (const inv of invoices) {
    if (inv._count.items > 0) continue;
    const gt = inv.grandTotal;
    await prisma.invoiceItem.create({
      data: {
        invoiceId: inv.id,
        itemName: 'Imported Items',
        quantity: 1,
        unit: 'piece',
        rate: gt,
        discount: 0,
        taxableValue: gt,
        taxRate: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: gt,
      },
    });
    fixed++;
  }

  console.log(`Fixed ${fixed} invoices with missing items`);
  await prisma.$disconnect();
}

main().catch(console.error);
