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

  async getDashboard(businessId: string) {
    const [totalCustomers, totalProducts, totalInvoices, pendingPayments] = await Promise.all([
      this.prisma.customer.count({ where: { businessId, isActive: true } }),
      this.prisma.product.count({ where: { businessId, isActive: true } }),
      this.prisma.invoice.count({ where: { businessId } }),
      this.prisma.invoice.aggregate({
        where: { businessId, status: 'CONFIRMED' },
        _sum: { grandTotal: true, paidAmount: true },
      }),
    ]);

    const totalBilled = pendingPayments._sum.grandTotal || 0;
    const totalPaid = pendingPayments._sum.paidAmount || 0;

    return {
      totalCustomers,
      totalProducts,
      totalInvoices,
      totalBilled,
      totalPaid,
      outstanding: totalBilled - totalPaid,
    };
  }
}
