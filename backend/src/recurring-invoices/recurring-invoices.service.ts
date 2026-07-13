import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringInvoiceDto, UpdateRecurringInvoiceDto } from './dto/create-recurring-invoice.dto';

@Injectable()
export class RecurringInvoicesService {
  private readonly logger = new Logger(RecurringInvoicesService.name);

  constructor(private prisma: PrismaService) {}

  async create(businessId: string, userId: string, dto: CreateRecurringInvoiceDto) {
    const items = dto.items.map(item => ({
      productId: item.productId,
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit || 'piece',
      rate: item.rate,
      taxRate: item.taxRate || 0,
      discount: item.discount || 0,
    }));

    const totalAmount = items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.rate - item.discount;
      const tax = (itemTotal * item.taxRate) / 100;
      return sum + itemTotal + tax;
    }, 0);

    return this.prisma.recurringInvoice.create({
      data: {
        businessId,
        customerId: dto.customerId,
        templateName: dto.templateName,
        frequency: dto.frequency,
        nextRunDate: new Date(dto.nextRunDate),
        items,
        notes: dto.notes,
        itemCount: items.length,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
      },
    });
  }

  async findAll(businessId: string) {
    return this.prisma.recurringInvoice.findMany({
      where: { businessId },
      include: { customer: true, invoices: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { nextRunDate: 'asc' },
    });
  }

  async findOne(businessId: string, id: string) {
    const recurring = await this.prisma.recurringInvoice.findFirst({
      where: { id, businessId },
      include: { customer: true, invoices: { orderBy: { createdAt: 'desc' } } },
    });
    if (!recurring) throw new NotFoundException('Recurring invoice not found');
    return recurring;
  }

  async update(businessId: string, id: string, dto: UpdateRecurringInvoiceDto) {
    const existing = await this.prisma.recurringInvoice.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Recurring invoice not found');

    const updateData: any = {};
    if (dto.templateName !== undefined) updateData.templateName = dto.templateName;
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
    if (dto.frequency !== undefined) updateData.frequency = dto.frequency;
    if (dto.nextRunDate !== undefined) updateData.nextRunDate = new Date(dto.nextRunDate);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.items) {
      updateData.items = dto.items.map(item => ({
        productId: item.productId,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit || 'piece',
        rate: item.rate,
        taxRate: item.taxRate || 0,
        discount: item.discount || 0,
      }));

      const totalAmount = updateData.items.reduce((sum: number, item: any) => {
        const itemTotal = item.quantity * item.rate - item.discount;
        const tax = (itemTotal * item.taxRate) / 100;
        return sum + itemTotal + tax;
      }, 0);

      updateData.itemCount = dto.items.length;
      updateData.totalAmount = parseFloat(totalAmount.toFixed(2));
    }

    return this.prisma.recurringInvoice.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(businessId: string, id: string) {
    const existing = await this.prisma.recurringInvoice.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Recurring invoice not found');

    await this.prisma.recurringInvoice.delete({ where: { id } });
    return { message: 'Recurring invoice deleted' };
  }

  async toggleActive(businessId: string, id: string) {
    const existing = await this.prisma.recurringInvoice.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Recurring invoice not found');

    return this.prisma.recurringInvoice.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
  }

  async processDueRecurringInvoices() {
    const now = new Date();
    const dueRecurring = await this.prisma.recurringInvoice.findMany({
      where: {
        isActive: true,
        nextRunDate: { lte: now },
      },
      include: { business: true, customer: true },
    });

    this.logger.log(`Processing ${dueRecurring.length} due recurring invoices`);

    const results = [];
    for (const recurring of dueRecurring) {
      try {
        const invoice = await this.generateInvoiceFromRecurring(recurring);
        results.push({ recurringId: recurring.id, invoiceId: invoice.id, status: 'success' });

        const nextRunDate = this.calculateNextRunDate(recurring.frequency, now);
        await this.prisma.recurringInvoice.update({
          where: { id: recurring.id },
          data: {
            lastRunDate: now,
            nextRunDate,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to generate invoice for recurring ${recurring.id}: ${error.message}`);
        results.push({ recurringId: recurring.id, status: 'error', error: error.message });
      }
    }

    return results;
  }

  private async generateInvoiceFromRecurring(recurring: any) {
    const items = (recurring.items as any[]).map((item: any) => ({
      productId: item.productId,
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      taxRate: item.taxRate,
      discount: item.discount,
    }));

    const invoiceNo = await this.generateInvoiceNumber(recurring.businessId);

    const isInterState = recurring.customer
      ? await this.isInterState(recurring.business, recurring.customerId)
      : false;

    const processedItems = items.map((item: any) => {
      const taxableValue = item.quantity * item.rate - (item.discount || 0);
      const taxRate = item.taxRate || 0;
      let cgst = 0, sgst = 0, igst = 0;

      if (taxRate > 0) {
        if (isInterState) {
          igst = parseFloat(((taxableValue * taxRate) / 100).toFixed(2));
        } else {
          const halfTax = taxRate / 2;
          cgst = parseFloat(((taxableValue * halfTax) / 100).toFixed(2));
          sgst = parseFloat(((taxableValue * halfTax) / 100).toFixed(2));
        }
      }

      const total = parseFloat((taxableValue + cgst + sgst + igst).toFixed(2));
      return { ...item, taxableValue, cgst, sgst, igst, total };
    });

    const subtotal = parseFloat(processedItems.reduce((sum: number, i: any) => sum + i.taxableValue, 0).toFixed(2));
    const taxAmount = parseFloat(processedItems.reduce((sum: number, i: any) => sum + i.cgst + i.sgst + i.igst, 0).toFixed(2));
    const grandTotal = parseFloat((subtotal + taxAmount).toFixed(2));

    return this.prisma.invoice.create({
      data: {
        businessId: recurring.businessId,
        customerId: recurring.customerId,
        invoiceNo,
        type: 'B2C',
        direction: 'SALE',
        invoiceDate: new Date(),
        subtotal,
        taxAmount,
        grandTotal,
        status: 'CONFIRMED',
        notes: recurring.notes || `Auto-generated from recurring template: ${recurring.templateName || 'Untitled'}`,
        recurringInvoiceId: recurring.id,
        createdById: recurring.businessId,
        items: {
          create: processedItems.map((item: any) => ({
            productId: item.productId,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            discount: item.discount || 0,
            taxableValue: item.taxableValue,
            taxRate: item.taxRate,
            cgst: item.cgst,
            sgst: item.sgst,
            igst: item.igst,
            total: item.total,
          })),
        },
      },
      include: { items: true },
    });
  }

  private async generateInvoiceNumber(businessId: string): Promise<string> {
    const count = await this.prisma.invoice.count({ where: { businessId } });
    const next = count + 1;
    return `INV-${String(next).padStart(6, '0')}`;
  }

  private async isInterState(business: any, customerId?: string | null): Promise<boolean> {
    if (!customerId) return false;
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    return customer?.state !== business.state;
  }

  private calculateNextRunDate(frequency: string, currentDate: Date): Date {
    const next = new Date(currentDate);
    switch (frequency) {
      case 'DAILY': next.setDate(next.getDate() + 1); break;
      case 'WEEKLY': next.setDate(next.getDate() + 7); break;
      case 'MONTHLY': next.setMonth(next.getMonth() + 1); break;
      case 'QUARTERLY': next.setMonth(next.getMonth() + 3); break;
      case 'YEARLY': next.setFullYear(next.getFullYear() + 1); break;
      default: next.setMonth(next.getMonth() + 1);
    }
    return next;
  }
}
