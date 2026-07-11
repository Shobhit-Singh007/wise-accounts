import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { EwayBillApiService } from './services/ewaybill-api.service';
import { EinvoiceApiService } from './services/einvoice-api.service';
import { InvoiceTemplatesService } from './services/invoice-templates.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private ewayBillApi: EwayBillApiService,
    private einvoiceApi: EinvoiceApiService,
    private templatesService: InvoiceTemplatesService,
  ) {}

  async createInvoice(businessId: string, userId: string, dto: CreateInvoiceDto) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');

    const direction = dto.direction || 'SALE';
    const invoiceNo = await this.generateInvoiceNumber(businessId, dto.type, direction);

    const isInterState = direction === 'SALE'
      ? await this.isInterState(business, dto.customerId)
      : await this.isInterStateSupplier(business, dto.supplierId);

    const items = dto.items.map((item) => {
      const taxableValue = item.quantity * item.rate - (item.discount || 0);
      const taxRate = item.taxRate || 0;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

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

      return {
        productId: item.productId,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit || 'piece',
        rate: item.rate,
        discount: item.discount || 0,
        taxableValue,
        taxRate,
        cgst,
        sgst,
        igst,
        total,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      };
    });

    const subtotal = parseFloat(items.reduce((sum, i) => sum + i.taxableValue, 0).toFixed(2));
    const taxAmount = parseFloat(items.reduce((sum, i) => sum + i.cgst + i.sgst + i.igst, 0).toFixed(2));
    const discount = dto.discount || 0;
    const grandTotal = parseFloat((subtotal + taxAmount - discount).toFixed(2));

    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          businessId,
          customerId: direction === 'SALE' ? dto.customerId : null,
          supplierId: direction === 'PURCHASE' ? dto.supplierId : null,
          invoiceNo,
          type: dto.type,
          direction,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          subtotal,
          taxAmount,
          discount,
          grandTotal,
          status: 'CONFIRMED',
          notes: dto.notes,
          terms: dto.terms,
          referenceId: dto.referenceId,
          createdById: userId,
          items: { create: items },
        },
        include: { items: true, customer: true },
      });

      if (direction === 'SALE' && dto.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
        if (customer) {
          const newBalance = customer.balance + grandTotal;
          await tx.customer.update({
            where: { id: dto.customerId },
            data: { balance: newBalance },
          });
          await tx.customerTransaction.create({
            data: {
              customerId: dto.customerId,
              type: 'INVOICE_CREATED',
              amount: grandTotal,
              balanceAfter: newBalance,
              description: `Invoice ${invoiceNo}`,
              referenceId: inv.id,
            },
          });
        }
      }

      if (!items.every((i) => !i.productId)) {
        await this.deductStockInTx(tx, inv.id);
      }

      return inv;
    });

    this.logger.log(`Invoice created: ${invoiceNo} (₹${grandTotal})`);
    return invoice;
  }

  async findAllInvoices(
    businessId: string,
    filters?: { status?: string; customerId?: string; direction?: string; page?: number; limit?: number },
  ) {
    const where: any = { businessId };
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.direction) where.direction = filters.direction;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { customer: true, items: true, payments: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOneInvoice(businessId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: {
        customer: true,
        items: true,
        payments: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async updateInvoice(businessId: string, invoiceId: string, dto: any) {
    const existing = await this.findOneInvoice(businessId, invoiceId);
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('Cannot edit a cancelled invoice');
    }

    // Delete old items and create new ones if items are provided
    if (dto.items && dto.items.length > 0) {
      await this.prisma.invoiceItem.deleteMany({ where: { invoiceId } });
    }

    const isInterState = existing.direction === 'SALE'
      ? await this.isInterState(
          await this.prisma.business.findUnique({ where: { id: businessId } }),
          dto.customerId || existing.customerId,
        )
      : await this.isInterStateSupplier(
          await this.prisma.business.findUnique({ where: { id: businessId } }),
          dto.supplierId || existing.supplierId,
        );

    let items: any[] = [];
    let subtotal = existing.subtotal;
    let taxAmount = existing.taxAmount;
    let grandTotal = existing.grandTotal;

    if (dto.items) {
      items = dto.items.map((item: any) => {
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
        return {
          invoiceId,
          productId: item.productId,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit || 'piece',
          rate: item.rate,
          discount: item.discount || 0,
          taxableValue,
          taxRate,
          cgst,
          sgst,
          igst,
          total: parseFloat((taxableValue + cgst + sgst + igst).toFixed(2)),
          batchNo: item.batchNo,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
        };
      });
      subtotal = parseFloat(items.reduce((sum: number, i: any) => sum + i.taxableValue, 0).toFixed(2));
      taxAmount = parseFloat(items.reduce((sum: number, i: any) => sum + i.cgst + i.sgst + i.igst, 0).toFixed(2));
      const discount = dto.discount !== undefined ? dto.discount : existing.discount;
      grandTotal = parseFloat((subtotal + taxAmount - discount).toFixed(2));
    }

    const updateData: any = {};
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
    if (dto.supplierId !== undefined) updateData.supplierId = dto.supplierId;
    if (dto.invoiceDate !== undefined) updateData.invoiceDate = new Date(dto.invoiceDate);
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.discount !== undefined) updateData.discount = dto.discount;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.terms !== undefined) updateData.terms = dto.terms;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.items) {
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.grandTotal = grandTotal;
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId } });
        await tx.invoiceItem.createMany({ data: items });
      }
      return tx.invoice.update({
        where: { id: invoiceId },
        data: updateData,
        include: { items: true, customer: true },
      });
    });
  }

  async deleteInvoice(businessId: string, invoiceId: string) {
    const invoice = await this.findOneInvoice(businessId, invoiceId);
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only draft invoices can be deleted');
    }
    await this.prisma.invoiceItem.deleteMany({ where: { invoiceId } });
    await this.prisma.invoice.delete({ where: { id: invoiceId } });
    return { message: 'Invoice deleted successfully' };
  }

  async getInvoiceSettings(businessId: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');
    const settings = (business.settings as any) || {};
    return {
      invoicePrefix: settings.invoicePrefix || 'INV-',
      startingNumber: settings.startingNumber || 1,
      defaultNotes: settings.defaultNotes || '',
      defaultTerms: settings.defaultTerms || '',
      bankName: settings.bankName || '',
      bankAccountNo: settings.bankAccountNo || '',
      bankIfsc: settings.bankIfsc || '',
      bankBranch: settings.bankBranch || '',
      upiId: settings.upiId || '',
      showGstin: settings.showGstin !== false,
      showBankDetails: settings.showBankDetails || false,
      showQrCode: settings.showQrCode || false,
      signatureUrl: settings.signatureUrl || '',
      activeTemplate: settings.activeTemplate || 'classic',
      ewayBillApi: settings.ewayBillApi || {},
      einvoiceApi: settings.einvoiceApi || {},
    };
  }

  async updateInvoiceSettings(businessId: string, dto: any) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');
    const currentSettings = (business.settings as any) || {};
    const newSettings = { ...currentSettings, ...dto };
    await this.prisma.business.update({
      where: { id: businessId },
      data: { settings: newSettings },
    });
    return { message: 'Invoice settings updated', settings: newSettings };
  }

  async generateEwayBill(businessId: string, invoiceId: string, dto: any) {
    const invoice = await this.findOneInvoice(businessId, invoiceId);
    if (invoice.ewayBillNo) {
      throw new BadRequestException('E-Way Bill already generated for this invoice');
    }

    const result = await this.ewayBillApi.generateEwayBill(businessId, invoice, dto);

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ewayBillNo: result.ewayBillNo,
        ewayBillDate: new Date(result.ewayBillDate),
        transporterId: dto.transporterId,
        transporterName: dto.transporterName,
        vehicleNo: dto.vehicleNo,
        distanceKm: dto.distanceKm,
        supplyType: dto.supplyType || 'Regular',
        docType: dto.docType || 'Tax Invoice',
        valueOfGoods: invoice.grandTotal,
      },
    });

    return {
      ewayBillNo: result.ewayBillNo,
      ewayBillDate: result.ewayBillDate,
      validUpto: result.validUpto,
      vehicleNo: dto.vehicleNo,
      distanceKm: dto.distanceKm,
      transporterName: dto.transporterName,
      message: result.message || 'E-Way Bill generated successfully',
    };
  }

  async generateEinvoice(businessId: string, invoiceId: string, dto: any) {
    const invoice = await this.findOneInvoice(businessId, invoiceId);
    if (invoice.irn) {
      throw new BadRequestException('e-Invoice already generated for this invoice');
    }

    const result = await this.einvoiceApi.generateEinvoice(businessId, invoice, dto);

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        irn: result.irn,
        irnDate: new Date(result.irnDate),
        ackNo: result.ackNo,
        ackDate: result.ackDate ? new Date(result.ackDate) : new Date(),
        qrCode: result.qrCode,
      },
    });

    return {
      irn: result.irn,
      irnDate: result.irnDate,
      ackNo: result.ackNo,
      ackDate: result.ackDate,
      qrCode: result.qrCode,
      message: result.message || 'e-Invoice generated successfully',
    };
  }

  async generateBoth(businessId: string, invoiceId: string, dto: any) {
    const invoice = await this.findOneInvoice(businessId, invoiceId);

    const results: any = { ewayBill: null, einvoice: null, errors: [] };

    // Generate E-Way Bill if not already done
    if (!invoice.ewayBillNo) {
      try {
        const ewayResult = await this.ewayBillApi.generateEwayBill(businessId, invoice, dto);
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            ewayBillNo: ewayResult.ewayBillNo,
            ewayBillDate: new Date(ewayResult.ewayBillDate),
            transporterId: dto.transporterId,
            transporterName: dto.transporterName,
            vehicleNo: dto.vehicleNo,
            distanceKm: dto.distanceKm,
            supplyType: dto.supplyType || 'Regular',
            docType: dto.docType || 'Tax Invoice',
            valueOfGoods: invoice.grandTotal,
          },
        });
        results.ewayBill = ewayResult;
      } catch (err) {
        results.errors.push({ type: 'ewayBill', message: err instanceof Error ? err.message : 'E-Way Bill failed' });
      }
    } else {
      results.ewayBill = { ewayBillNo: invoice.ewayBillNo, message: 'Already generated' };
    }

    // Generate e-Invoice if requested and not already done
    if (dto.generateEinvoice !== false && !invoice.irn) {
      try {
        const einvoiceResult = await this.einvoiceApi.generateEinvoice(businessId, invoice, dto);
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            irn: einvoiceResult.irn,
            irnDate: new Date(einvoiceResult.irnDate),
            ackNo: einvoiceResult.ackNo,
            ackDate: einvoiceResult.ackDate ? new Date(einvoiceResult.ackDate) : new Date(),
            qrCode: einvoiceResult.qrCode,
          },
        });
        results.einvoice = einvoiceResult;
      } catch (err) {
        results.errors.push({ type: 'einvoice', message: err instanceof Error ? err.message : 'e-Invoice failed' });
      }
    } else if (invoice.irn) {
      results.einvoice = { irn: invoice.irn, message: 'Already generated' };
    }

    // Get fresh invoice
    const updated = await this.findOneInvoice(businessId, invoiceId);
    results.invoice = updated;

    if (results.errors.length > 0 && !results.ewayBill && !results.einvoice) {
      throw new BadRequestException(`Generation failed: ${results.errors.map((e: any) => e.message).join(', ')}`);
    }

    return results;
  }

  getTemplates() {
    return this.templatesService.getTemplates();
  }

  async cancelInvoice(businessId: string, invoiceId: string) {
    const invoice = await this.findOneInvoice(businessId, invoiceId);
    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Invoice already cancelled');
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'CANCELLED' },
    });

    if (invoice.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: invoice.customerId } });
      if (customer) {
        const newBalance = customer.balance - invoice.grandTotal;
        await this.prisma.customer.update({
          where: { id: invoice.customerId },
          data: { balance: newBalance },
        });
      }
    }

    return { message: 'Invoice cancelled successfully' };
  }

  async createCreditNote(businessId: string, userId: string, dto: CreateCreditNoteDto) {
    const invoice = await this.findOneInvoice(businessId, dto.invoiceId);

    const creditNoteNo = `CN-${Date.now()}`;
    let totalCredit = 0;

    const creditItems: Array<{
      invoiceItemId: string;
      productId: string | null;
      itemName: string;
      quantity: number;
      unit: string;
      rate: number;
      discount: number;
      taxableValue: number;
      taxRate: number;
      cgst: number;
      sgst: number;
      igst: number;
      total: number;
      reason?: string;
    }> = [];
    for (const item of dto.items) {
      const invoiceItem = invoice.items.find((i) => i.id === item.invoiceItemId);
      if (!invoiceItem) throw new NotFoundException(`Invoice item ${item.invoiceItemId} not found`);

      const perUnitTotal = invoiceItem.total / invoiceItem.quantity;
      const creditAmount = parseFloat((perUnitTotal * item.quantity).toFixed(2));
      totalCredit += creditAmount;

      creditItems.push({
        invoiceItemId: invoiceItem.id,
        productId: invoiceItem.productId,
        itemName: invoiceItem.itemName,
        quantity: item.quantity,
        unit: invoiceItem.unit,
        rate: invoiceItem.rate,
        discount: invoiceItem.discount,
        taxableValue: invoiceItem.taxableValue,
        taxRate: invoiceItem.taxRate,
        cgst: invoiceItem.cgst,
        sgst: invoiceItem.sgst,
        igst: invoiceItem.igst,
        total: creditAmount,
        reason: item.reason,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      if (invoice.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: invoice.customerId } });
        if (customer) {
          const newBalance = customer.balance - totalCredit;
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: { balance: newBalance },
          });
        }
      }

      await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: { status: 'CREDITED' },
      });

      await tx.creditNote.create({
        data: {
          invoiceId: dto.invoiceId,
          creditNoteNo,
          totalCredit,
          reason: dto.reason,
          createdById: userId,
          items: { create: creditItems },
        },
      });
    });

    return { creditNoteNo, totalCredit, message: 'Credit note created' };
  }

  async getInvoicePdf(businessId: string, invoiceId: string, templateId?: string): Promise<Buffer> {
    const invoice = await this.findOneInvoice(businessId, invoiceId);
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    const settings = (business?.settings as any) || {};
    const template = templateId
      ? this.templatesService.getTemplate(templateId)
      : this.templatesService.getActiveTemplate(settings);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const accent = template.accentColor;
      const headerStyle = template.headerStyle;
      const tableStyle = template.tableStyle;

      // Header
      if (headerStyle === 'filled') {
        doc.rect(0, 0, doc.page.width, 100).fill(accent);
        doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text(invoice.invoiceNo, 30, 20);
        doc.fontSize(10).font('Helvetica').text(`${invoice.direction} Invoice`, 30, 42);
        doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 30, 56);
        if (invoice.dueDate) doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 30, 70);
      } else if (headerStyle === 'gradient') {
        for (let i = 0; i < 100; i++) {
          const opacity = 1 - (i / 100) * 0.5;
          doc.rect(0, i, doc.page.width, 1).fill(accent);
        }
        doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text(invoice.invoiceNo, 30, 20);
        doc.fontSize(10).font('Helvetica').text(`${invoice.direction} Invoice`, 30, 42);
        doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 30, 56);
      } else if (headerStyle === 'bordered') {
        doc.rect(0, 0, doc.page.width, 4).fill(accent);
        doc.fillColor(accent).fontSize(18).font('Helvetica-Bold').text(invoice.invoiceNo, 30, 15);
        doc.fontSize(10).font('Helvetica').text(`${invoice.direction} Invoice | Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 30, 38);
      } else if (headerStyle === 'underline') {
        doc.fillColor(accent).fontSize(18).font('Helvetica-Bold').text(invoice.invoiceNo, 30, 20);
        doc.fontSize(10).font('Helvetica').text(`${invoice.direction} Invoice`, 30, 42);
        doc.moveTo(30, 55).lineTo(doc.page.width - 30, 55).strokeColor(accent).lineWidth(2).stroke();
        doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 30, 60);
      } else {
        // minimal
        doc.fillColor(accent).fontSize(20).font('Helvetica-Bold').text(invoice.invoiceNo, 30, 20);
        doc.fontSize(10).font('Helvetica').fillColor('#666').text(`${invoice.direction} Invoice | ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 30, 45);
      }

      // Business info (right side)
      const bizInfoY = headerStyle === 'filled' || headerStyle === 'gradient' ? 20 : 20;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text(business?.name || '', doc.page.width - 250, bizInfoY, { width: 220, align: 'right' });
      doc.fontSize(9).font('Helvetica');
      if (business?.address) doc.text(business.address, doc.page.width - 250, bizInfoY + 16, { width: 220, align: 'right' });
      if (business?.city || business?.state) doc.text(`${business.city || ''} ${business.state || ''} ${business.pincode || ''}`.trim(), doc.page.width - 250, bizInfoY + 28, { width: 220, align: 'right' });
      if (business?.phone) doc.text(`Ph: ${business.phone}`, doc.page.width - 250, bizInfoY + 40, { width: 220, align: 'right' });
      if (settings.showGstin !== false && business?.gstin) doc.text(`GSTIN: ${business.gstin}`, doc.page.width - 250, bizInfoY + 52, { width: 220, align: 'right' });

      // Status badge
      const statusColors: Record<string, string> = { CONFIRMED: '#2e7d32', DRAFT: '#ff8f00', CANCELLED: '#c62828', CREDITED: '#e65100' };
      doc.roundedRect(doc.page.width - 110, bizInfoY + 55, 80, 18, 3).fill(statusColors[invoice.status] || '#666');
      doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text(invoice.status, doc.page.width - 110, bizInfoY + 59, { width: 80, align: 'center' });

      // Bill To
      let y = headerStyle === 'filled' || headerStyle === 'gradient' ? 115 : 90;
      doc.fillColor(accent).rect(30, y, doc.page.width - 60, 18).fill(accent + '15');
      doc.fillColor(accent).fontSize(9).font('Helvetica-Bold').text('BILL TO', 35, y + 4);
      y += 22;
      doc.fillColor('#333').font('Helvetica').fontSize(9);
      if (invoice.customer) {
        doc.text(invoice.customer.name || '', 35, y);
        if (invoice.customer.address) doc.text(invoice.customer.address, 35, y + 12, { width: 220 });
        if (invoice.customer.city || invoice.customer.state) doc.text(`${invoice.customer.city || ''} ${invoice.customer.state || ''} ${invoice.customer.pincode || ''}`.trim(), 35, y + 24, { width: 220 });
        if (invoice.customer.gstin) doc.text(`GSTIN: ${invoice.customer.gstin}`, 35, y + 36);
        if (invoice.customer.phone) doc.text(`Ph: ${invoice.customer.phone}`, 35, y + 48);
      } else {
        doc.text('Walk-in Customer', 35, y);
      }

      // E-Way Bill info
      if (invoice.ewayBillNo) {
        y += 65;
        doc.fillColor('#ff6f00').fontSize(8).font('Helvetica-Bold').text(`E-Way Bill: ${invoice.ewayBillNo}`, 35, y);
        if (invoice.vehicleNo) doc.text(`Vehicle: ${invoice.vehicleNo}`, 35, y + 12);
        if (invoice.transporterName) doc.text(`Transporter: ${invoice.transporterName}`, 35, y + 24);
      }

      // e-Invoice info
      if (invoice.irn) {
        const einvY = invoice.ewayBillNo ? y + 36 : y + 65;
        doc.fillColor('#1565c0').fontSize(8).font('Helvetica-Bold').text(`IRN: ${invoice.irn}`, 35, einvY);
        if (invoice.ackNo) doc.text(`Ack No: ${invoice.ackNo}`, 35, einvY + 12);
      }

      // Table header
      y = Math.max(y + 80, 220);
      const colX = [30, 200, 270, 330, 390, 450, 515];
      const colW = [170, 70, 60, 60, 60, 65, 65];
      const headers = ['Item', 'Qty', 'Rate', 'Disc', 'Taxable', 'Tax', 'Total'];

      if (tableStyle === 'striped') {
        doc.rect(30, y, doc.page.width - 60, 20).fill(accent);
      } else if (tableStyle === 'modern') {
        doc.roundedRect(30, y, doc.page.width - 60, 20, 3).fill(accent);
      } else if (tableStyle === 'alternate') {
        doc.rect(30, y, doc.page.width - 60, 20).fill(accent);
      } else {
        doc.rect(30, y, doc.page.width - 60, 20).fill(accent);
      }

      doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(h, colX[i], y + 6, { width: colW[i], align: i === 0 ? 'left' : 'right' }));
      y += 20;

      // Table rows
      doc.font('Helvetica').fontSize(8);
      let rowIdx = 0;
      for (const item of invoice.items) {
        if (y > 720) {
          doc.addPage();
          y = 40;
          if (tableStyle === 'modern') {
            doc.roundedRect(30, y, doc.page.width - 60, 20, 3).fill(accent);
          } else {
            doc.rect(30, y, doc.page.width - 60, 20).fill(accent);
          }
          doc.fillColor('white').font('Helvetica-Bold');
          headers.forEach((h, i) => doc.text(h, colX[i], y + 6, { width: colW[i], align: i === 0 ? 'left' : 'right' }));
          y += 20;
          doc.font('Helvetica').fontSize(8);
        }

        // Row background
        if (tableStyle === 'striped' && rowIdx % 2 === 1) {
          doc.fillColor('#f5f5f5').rect(30, y - 2, doc.page.width - 60, 16).fill('#f5f5f5');
        } else if (tableStyle === 'alternate' && rowIdx % 2 === 1) {
          doc.fillColor(accent + '08').rect(30, y - 2, doc.page.width - 60, 16).fill(accent + '08');
        }

        doc.fillColor('#333');
        doc.text(item.itemName, colX[0], y, { width: colW[0], lineBreak: false });
        doc.text(`${item.quantity} ${item.unit}`, colX[1], y, { width: colW[1], align: 'right' });
        doc.text(`Rs. ${item.rate.toFixed(2)}`, colX[2], y, { width: colW[2], align: 'right' });
        doc.text(item.discount > 0 ? `Rs. ${item.discount.toFixed(2)}` : '-', colX[3], y, { width: colW[3], align: 'right' });
        doc.text(`Rs. ${item.taxableValue.toFixed(2)}`, colX[4], y, { width: colW[4], align: 'right' });
        const taxLabel = item.igst > 0 ? `${item.taxRate}% IGST` : `${item.taxRate}%`;
        doc.text(taxLabel, colX[5], y, { width: colW[5], align: 'right' });
        doc.font('Helvetica-Bold').text(`Rs. ${item.total.toFixed(2)}`, colX[6], y, { width: colW[6], align: 'right' });
        doc.font('Helvetica');
        y += 16;
        if (tableStyle === 'bordered') {
          doc.moveTo(30, y - 2).lineTo(doc.page.width - 30, y - 2).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
        } else if (tableStyle === 'modern') {
          doc.moveTo(30, y - 2).lineTo(doc.page.width - 30, y - 2).strokeColor(accent + '20').lineWidth(0.3).stroke();
        }
        rowIdx++;
      }

      // Totals
      y += 5;
      const totalX = 350;
      const totalW = doc.page.width - 30 - totalX;

      if (tableStyle === 'modern' || tableStyle === 'alternate') {
        doc.roundedRect(totalX, y, totalW, 85, 4).fill(accent + '08');
      } else {
        doc.fillColor('#e8eaf6').rect(totalX, y, totalW, 85).fill('#e8eaf6');
      }

      let ty = y + 8;
      doc.fillColor('#666').font('Helvetica').fontSize(9);
      doc.text('Subtotal:', totalX + 10, ty, { width: 100 });
      doc.fillColor('#333').text(`Rs. ${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalX + 110, ty, { width: totalW - 120, align: 'right' });
      ty += 16;

      doc.fillColor('#666').text('Discount:', totalX + 10, ty, { width: 100 });
      doc.fillColor('#333').text(`Rs. ${(invoice.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalX + 110, ty, { width: totalW - 120, align: 'right' });
      ty += 16;

      doc.fillColor('#666').text('Tax:', totalX + 10, ty, { width: 100 });
      doc.fillColor('#333').text(`Rs. ${invoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalX + 110, ty, { width: totalW - 120, align: 'right' });
      ty += 18;

      doc.fillColor(accent).font('Helvetica-Bold').fontSize(11);
      doc.text('Grand Total:', totalX + 10, ty, { width: 100 });
      doc.text(`Rs. ${invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalX + 110, ty, { width: totalW - 120, align: 'right' });
      ty += 16;

      if (invoice.paidAmount > 0) {
        doc.fillColor('#666').font('Helvetica').fontSize(9);
        doc.text('Paid:', totalX + 10, ty, { width: 100 });
        doc.fillColor('#2e7d32').text(`Rs. ${invoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalX + 110, ty, { width: totalW - 120, align: 'right' });
        ty += 16;
        doc.fillColor('#c62828').font('Helvetica-Bold').text('Balance:', totalX + 10, ty, { width: 100 });
        doc.text(`Rs. ${(invoice.grandTotal - invoice.paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalX + 110, ty, { width: totalW - 120, align: 'right' });
      }

      // Notes & Terms
      if (invoice.notes || invoice.terms) {
        y = Math.max(y + 95, ty + 10);
        if (y > 700) { doc.addPage(); y = 40; }
        if (invoice.notes) {
          doc.fillColor('#333').font('Helvetica-Bold').fontSize(9).text('Notes:', 30, y);
          doc.font('Helvetica').fontSize(8).text(invoice.notes, 30, y + 12, { width: doc.page.width - 60 });
          y += 30;
        }
        if (invoice.terms) {
          doc.fillColor('#333').font('Helvetica-Bold').fontSize(9).text('Terms & Conditions:', 30, y);
          doc.font('Helvetica').fontSize(8).text(invoice.terms, 30, y + 12, { width: doc.page.width - 60 });
        }
      }

      // Bank details
      if (settings.showBankDetails && (settings.bankName || settings.bankAccountNo)) {
        y += 50;
        if (y > 700) { doc.addPage(); y = 40; }
        if (tableStyle === 'modern') {
          doc.roundedRect(30, y, doc.page.width - 60, 16, 3).fill(accent);
        } else {
          doc.fillColor(accent).rect(30, y, doc.page.width - 60, 16).fill(accent);
        }
        doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text('BANK DETAILS', 35, y + 3);
        y += 20;
        doc.fillColor('#333').font('Helvetica').fontSize(8);
        if (settings.bankName) doc.text(`Bank: ${settings.bankName}`, 35, y);
        if (settings.bankAccountNo) doc.text(`A/C: ${settings.bankAccountNo}`, 35, y + 12);
        if (settings.bankIfsc) doc.text(`IFSC: ${settings.bankIfsc}`, 35, y + 24);
        if (settings.upiId) doc.text(`UPI: ${settings.upiId}`, 35, y + 36);
      }

      // Footer
      doc.fontSize(7).fillColor('#999').font('Helvetica')
        .text(`Generated by Wise Accounts | ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
          30, doc.page.height - 25, { width: doc.page.width - 60, align: 'center' });

      doc.end();
    });
  }

  async getInvoicePrintHtml(businessId: string, invoiceId: string, templateId?: string): Promise<string> {
    const invoice = await this.findOneInvoice(businessId, invoiceId);
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    const settings = (business?.settings as any) || {};
    const template = templateId
      ? this.templatesService.getTemplate(templateId)
      : this.templatesService.getActiveTemplate(settings);

    const accent = template.accentColor;
    const headerStyle = template.headerStyle;
    const tableStyle = template.tableStyle;
    const statusColors: Record<string, string> = { CONFIRMED: '#2e7d32', DRAFT: '#ff8f00', CANCELLED: '#c62828', CREDITED: '#e65100' };

    let headerCss = `padding:20px;display:flex;justify-content:space-between;color:white`;
    if (headerStyle === 'filled') headerCss = `background:${accent};color:white;padding:20px;display:flex;justify-content:space-between`;
    else if (headerStyle === 'gradient') headerCss = `background:linear-gradient(135deg,${accent},${accent}cc);color:white;padding:20px;display:flex;justify-content:space-between`;
    else if (headerStyle === 'bordered') headerCss = `border-bottom:4px solid ${accent};padding:20px;display:flex;justify-content:space-between`;
    else if (headerStyle === 'underline') headerCss = `border-bottom:2px solid ${accent};padding:20px;display:flex;justify-content:space-between;color:${accent}`;
    else headerCss = `padding:20px;display:flex;justify-content:space-between;color:${accent}`;

    const tableHeaderBg = accent;
    let tableRowCss = '';
    if (tableStyle === 'striped') tableRowCss = 'tr:nth-child(even) td{background:#f5f5f5}';
    else if (tableStyle === 'alternate') tableRowCss = `tr:nth-child(even) td{background:${accent}08}`;
    else if (tableStyle === 'modern') tableRowCss = 'td{border-bottom:1px solid #eee}';
    else if (tableStyle === 'minimal') tableRowCss = 'td{border-bottom:none}';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${invoice.invoiceNo}</title>
<style>
body{font-family:Arial,sans-serif;margin:20px;color:#333}
.header{${headerCss}}
.header h1{margin:0;font-size:22px}
.header .meta{font-size:12px;margin-top:5px}
.status{display:inline-block;padding:3px 12px;border-radius:12px;color:white;font-size:11px;font-weight:bold;background:${statusColors[invoice.status] || '#666'}}
.section{border:1px solid #e0e0e0;padding:12px;margin:15px 0;border-radius:4px}
.section h3{margin:0 0 8px 0;color:${accent};font-size:13px}
table{width:100%;border-collapse:collapse;margin:15px 0}
th{background:${tableHeaderBg};color:white;padding:8px 6px;font-size:11px;text-align:right}
th:first-child{text-align:left}
td{padding:8px 6px;border-bottom:1px solid #e0e0e0;font-size:11px;text-align:right}
td:first-child{text-align:left}
${tableRowCss}
.totals{float:right;width:250px;margin-top:10px}
.totals table td{padding:4px 8px;font-size:12px}
.totals .grand{font-weight:bold;font-size:14px;border-top:2px solid ${accent}}
.footer{text-align:center;font-size:10px;color:#999;margin-top:30px;border-top:1px solid #e0e0e0;padding-top:10px}
.eway-section{background:#fff3e0;border:1px solid #ff6f00;padding:10px;margin:10px 0;border-radius:4px}
.einvoice-section{background:#e3f2fd;border:1px solid #1565c0;padding:10px;margin:10px 0;border-radius:4px}
.bank-details{background:#f5f5f5;padding:10px;margin:10px 0;border-radius:4px;font-size:11px}
</style></head><body>
<div class="header"><div><h1>${invoice.invoiceNo}</h1><div class="meta">${invoice.direction} Invoice | ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</div>
${invoice.dueDate ? `<div class="meta">Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>` : ''}
<div style="margin-top:8px"><span class="status">${invoice.status}</span></div></div>
<div style="text-align:right"><strong>${business?.name || ''}</strong><br>
${business?.address ? business.address + '<br>' : ''}${business?.city || ''} ${business?.state || ''} ${business?.pincode || ''}<br>
${business?.phone ? 'Ph: ' + business.phone + '<br>' : ''}
${settings.showGstin !== false && business?.gstin ? 'GSTIN: ' + business.gstin : ''}</div></div>
<div style="margin:15px 0"><div class="section" style="width:48%;display:inline-block;vertical-align:top"><h3>Bill To</h3>
${invoice.customer ? `<strong>${invoice.customer.name}</strong><br>${invoice.customer.address || ''}<br>
${invoice.customer.city || ''} ${invoice.customer.state || ''} ${invoice.customer.pincode || ''}<br>
${invoice.customer.gstin ? 'GSTIN: ' + invoice.customer.gstin + '<br>' : ''}${invoice.customer.phone ? 'Ph: ' + invoice.customer.phone : ''}` : 'Walk-in Customer'}</div></div>
${invoice.ewayBillNo ? `<div class="eway-section"><strong>E-Way Bill:</strong> ${invoice.ewayBillNo} | Vehicle: ${invoice.vehicleNo || '-'} | Transporter: ${invoice.transporterName || '-'} | Distance: ${invoice.distanceKm || '-'} km</div>` : ''}
${invoice.irn ? `<div class="einvoice-section"><strong>IRN:</strong> ${invoice.irn}<br>${invoice.ackNo ? 'Ack No: ' + invoice.ackNo : ''}${invoice.irnDate ? ' | Date: ' + new Date(invoice.irnDate).toLocaleDateString('en-IN') : ''}</div>` : ''}
<table><thead><tr><th style="text-align:left">Item</th><th>Qty</th><th>Rate</th><th>Disc</th><th>Taxable</th><th>Tax</th><th>Total</th></tr></thead><tbody>
${invoice.items.map(i => `<tr><td style="text-align:left">${i.itemName}</td><td>${i.quantity} ${i.unit}</td><td>₹${i.rate.toFixed(2)}</td>
<td>${i.discount > 0 ? '₹' + i.discount.toFixed(2) : '-'}</td><td>₹${i.taxableValue.toFixed(2)}</td>
<td>${i.igst > 0 ? i.taxRate + '% IGST' : i.taxRate + '%'}</td><td>₹${i.total.toFixed(2)}</td></tr>`).join('')}
</tbody></table>
<div class="totals"><table><tr><td>Subtotal</td><td style="text-align:right">₹${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
<tr><td>Discount</td><td style="text-align:right">₹${(invoice.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
<tr><td>Tax</td><td style="text-align:right">₹${invoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
<tr class="grand"><td>Grand Total</td><td style="text-align:right">₹${invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
${invoice.paidAmount > 0 ? `<tr><td>Paid</td><td style="text-align:right;color:#2e7d32">₹${invoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
<tr><td><strong>Balance</strong></td><td style="text-align:right;color:#c62828"><strong>₹${(invoice.grandTotal - invoice.paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td></tr>` : ''}
</table></div>
${invoice.notes ? `<div class="section"><h3>Notes</h3><p>${invoice.notes}</p></div>` : ''}
${invoice.terms ? `<div class="section"><h3>Terms & Conditions</h3><p>${invoice.terms}</p></div>` : ''}
${settings.showBankDetails && settings.bankName ? `<div class="bank-details"><strong>Bank Details:</strong> ${settings.bankName} | A/C: ${settings.bankAccountNo || '-'} | IFSC: ${settings.bankIfsc || '-'}${settings.upiId ? ' | UPI: ' + settings.upiId : ''}</div>` : ''}
<div class="footer">Generated by Wise Accounts | ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
</body></html>`;
  }

  private async generateInvoiceNumber(businessId: string, type: string, direction: string): Promise<string> {
    const dirPrefix = direction === 'PURCHASE' ? 'PUR-' : '';
    const prefix = type === 'B2B' ? `${dirPrefix}INV-B2B-` : `${dirPrefix}INV-`;
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 900) + 100;
    return `${prefix}${timestamp}-${random}`;
  }

  private async isInterState(business: any, customerId?: string): Promise<boolean> {
    if (!customerId || !business.state) return false;
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || !customer.state) return false;
    return customer.state.toLowerCase() !== business.state.toLowerCase();
  }

  private async isInterStateSupplier(business: any, supplierId?: string): Promise<boolean> {
    if (!supplierId || !business.state) return false;
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier || !supplier.state) return false;
    return supplier.state.toLowerCase() !== business.state.toLowerCase();
  }

  private async deductStockInTx(tx: any, invoiceId: string) {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });
    if (!invoice) return;

    for (const item of invoice.items) {
      if (!item.productId) continue;

      const batchWhere: any = { productId: item.productId, quantity: { gt: 0 } };
      if (item.batchNo) batchWhere.batchNo = item.batchNo;

      const batches = await tx.stockBatch.findMany({
        where: batchWhere,
        orderBy: { expiryDate: 'asc' },
      });

      let remainingQty = item.quantity;
      for (const batch of batches) {
        if (remainingQty <= 0) break;
        const deduct = Math.min(batch.quantity, remainingQty);
        await tx.stockBatch.update({
          where: { id: batch.id },
          data: { quantity: batch.quantity - deduct },
        });
        remainingQty -= deduct;
      }
    }
  }

  private async deductStock(invoiceId: string) {
    return this.prisma.$transaction((tx) => this.deductStockInTx(tx, invoiceId));
  }
}
