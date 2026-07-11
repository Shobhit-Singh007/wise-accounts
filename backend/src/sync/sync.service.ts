import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  async pushChanges(businessId: string, deviceId: string, changes: any[]) {
    const results: any[] = [];

    for (const change of changes) {
      try {
        await this.applyChange(businessId, change);
        results.push({ table: change.table, action: change.action, success: true });
      } catch (error: any) {
        this.logger.error(`Sync failed for ${change.table}:${change.action}: ${error.message}`);
        results.push({ table: change.table, action: change.action, success: false, error: error.message });
      }
    }

    return {
      synced: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  async pullChanges(businessId: string, deviceId: string, lastSyncAt?: string) {
    const since = lastSyncAt ? new Date(lastSyncAt) : new Date(0);

    const [products, customers, invoices, payments, stockBatches] = await Promise.all([
      this.prisma.product.findMany({ where: { businessId, updatedAt: { gte: since } } }),
      this.prisma.customer.findMany({ where: { businessId, updatedAt: { gte: since } } }),
      this.prisma.invoice.findMany({ where: { businessId, createdAt: { gte: since } }, include: { items: true } }),
      this.prisma.payment.findMany({ where: { businessId, createdAt: { gte: since } } }),
      this.prisma.stockBatch.findMany({
        where: { product: { businessId }, updatedAt: { gte: since } },
        include: { product: true },
      }),
    ]);

    return {
      timestamp: new Date().toISOString(),
      data: { products, customers, invoices, payments, stockBatches },
      counts: {
        products: products.length,
        customers: customers.length,
        invoices: invoices.length,
        payments: payments.length,
        stockBatches: stockBatches.length,
      },
    };
  }

  private async applyChange(businessId: string, change: any) {
    const { table, action, data } = change;
    const payload = { ...data, businessId };

    switch (table) {
      case 'customers':
        if (action === 'create' || action === 'update') {
          await this.prisma.customer.upsert({
            where: { id: data.id || 'new' },
            update: payload,
            create: { ...payload, name: data.name || 'Unknown', id: data.id || undefined },
          });
        } else if (action === 'delete') {
          await this.prisma.customer.update({ where: { id: data.id }, data: { isActive: false } });
        }
        break;

      case 'products':
        if (action === 'create' || action === 'update') {
          await this.prisma.product.upsert({
            where: { id: data.id || 'new' },
            update: payload,
            create: { ...payload, name: data.name || 'Unknown', id: data.id || undefined },
          });
        } else if (action === 'delete') {
          await this.prisma.product.update({ where: { id: data.id }, data: { isActive: false } });
        }
        break;

      case 'payments':
        if (action === 'create') {
          await this.prisma.payment.create({
            data: { businessId, amount: data.amount, method: data.method || 'CASH', ...data },
          });
        }
        break;

      default:
        throw new Error(`Unknown table: ${table}`);
    }
  }
}
