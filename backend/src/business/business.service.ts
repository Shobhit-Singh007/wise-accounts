import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto) {
    const business = await this.prisma.business.create({ data: dto });

    await this.prisma.userBusiness.create({
      data: { userId, businessId: business.id, isDefault: true },
    });

    await this.prisma.warehouse.create({
      data: { businessId: business.id, name: 'Main Warehouse' },
    });

    return business;
  }

  async findAll(userId: string) {
    const memberships = await this.prisma.userBusiness.findMany({
      where: { userId },
      include: { business: true },
    });
    return memberships.map((m) => m.business);
  }

  async findOne(businessId: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async update(businessId: string, dto: UpdateBusinessDto) {
    await this.findOne(businessId);
    return this.prisma.business.update({ where: { id: businessId }, data: dto });
  }

  async remove(businessId: string) {
    await this.findOne(businessId);
    await this.prisma.business.update({
      where: { id: businessId },
      data: { isActive: false },
    });
  }

  async createWarehouse(businessId: string, dto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({ data: { ...dto, businessId } });
  }

  async findWarehouses(businessId: string) {
    return this.prisma.warehouse.findMany({ where: { businessId, isActive: true } });
  }

  async findWarehouse(businessId: string, warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, businessId },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async updateWarehouse(businessId: string, warehouseId: string, dto: Partial<CreateWarehouseDto>) {
    await this.findWarehouse(businessId, warehouseId);
    return this.prisma.warehouse.update({
      where: { id: warehouseId },
      data: dto,
    });
  }

  async removeWarehouse(businessId: string, warehouseId: string) {
    await this.findWarehouse(businessId, warehouseId);
    return this.prisma.warehouse.update({
      where: { id: warehouseId },
      data: { isActive: false },
    });
  }

  async getDashboard(businessId: string) {
    const [
      totalCustomers,
      totalProducts,
      totalInvoices,
      pendingPayments,
      pendingInvoices,
      overdueInvoices,
      monthlySalesData,
      paymentMethodData,
      topCustomersData,
      topProductsData,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { businessId, isActive: true } }),
      this.prisma.product.count({ where: { businessId, isActive: true } }),
      this.prisma.invoice.count({ where: { businessId } }),
      this.prisma.invoice.aggregate({
        where: { businessId, status: 'CONFIRMED' },
        _sum: { grandTotal: true, paidAmount: true },
      }),
      this.prisma.invoice.findMany({
        where: { businessId, status: 'CONFIRMED' },
        select: { grandTotal: true, paidAmount: true },
      }).then((inv) => inv.filter((i) => i.paidAmount < i.grandTotal).length),
      this.prisma.invoice.findMany({
        where: {
          businessId,
          status: 'CONFIRMED',
          dueDate: { lt: new Date() },
        },
        select: { grandTotal: true, paidAmount: true, dueDate: true },
      }).then((inv) => inv.filter((i) => i.paidAmount < i.grandTotal).length),
      this.getMonthlySales(businessId),
      this.getPaymentMethodBreakdown(businessId),
      this.getTopCustomers(businessId),
      this.getTopProducts(businessId),
    ]);

    const totalBilled = pendingPayments._sum.grandTotal || 0;
    const totalPaid = pendingPayments._sum.paidAmount || 0;

    return {
      totalCustomers,
      totalProducts,
      totalInvoices,
      totalRevenue: totalPaid,
      totalBilled,
      outstanding: totalBilled - totalPaid,
      pendingInvoices: pendingInvoices as number,
      overdueInvoices: overdueInvoices as number,
      monthlySales: monthlySalesData,
      paymentMethodBreakdown: paymentMethodData,
      topCustomers: topCustomersData,
      topProducts: topProductsData,
    };
  }

  private async getMonthlySales(businessId: string) {
    const months: { month: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const result = await this.prisma.invoice.aggregate({
        where: {
          businessId,
          status: 'CONFIRMED',
          createdAt: { gte: start, lte: end },
        },
        _sum: { grandTotal: true },
      });

      months.push({
        month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
        amount: result._sum.grandTotal || 0,
      });
    }
    return months;
  }

  private async getPaymentMethodBreakdown(businessId: string) {
    const payments = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { businessId, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });

    return payments.map((p) => ({
      method: p.method,
      total: p._sum.amount || 0,
      count: p._count,
    }));
  }

  private async getTopCustomers(businessId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { businessId, status: 'CONFIRMED' },
      include: { customer: true },
    });

    const customerMap: Record<string, { name: string; total: number }> = {};
    for (const inv of invoices) {
      const key = inv.customerId || 'no-customer';
      if (!customerMap[key]) {
        customerMap[key] = { name: inv.customer?.name || 'Unknown', total: 0 };
      }
      customerMap[key].total += inv.grandTotal;
    }

    return Object.values(customerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }

  private async getTopProducts(businessId: string) {
    const invoiceItems = await this.prisma.invoiceItem.findMany({
      where: { invoice: { businessId, status: 'CONFIRMED' } },
    });

    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const item of invoiceItems) {
      const key = item.itemName;
      if (!productMap[key]) {
        productMap[key] = { name: item.itemName, quantity: 0, revenue: 0 };
      }
      productMap[key].quantity += item.quantity;
      productMap[key].revenue += item.total;
    }

    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }
}
