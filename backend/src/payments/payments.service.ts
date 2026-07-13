import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRazorpayOrderDto } from './dto/razorpay-order.dto';
import PDFDocument from 'pdfkit';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: any = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (keyId && keySecret) {
      try {
        const Razorpay = require('razorpay');
        this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      } catch {
        this.logger.warn('Razorpay SDK not installed. Payment gateway unavailable.');
      }
    }
  }

  async recordPayment(businessId: string, dto: CreatePaymentDto) {
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: dto.invoiceId, businessId },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');

      const newPaidAmount = invoice.paidAmount + dto.amount;

      await this.prisma.invoice.update({
        where: { id: dto.invoiceId },
        data: { paidAmount: newPaidAmount },
      });
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, businessId },
      });
      if (customer) {
        const newBalance = customer.balance - dto.amount;
        await this.prisma.customer.update({
          where: { id: dto.customerId },
          data: { balance: newBalance },
        });
        await this.prisma.customerTransaction.create({
          data: {
            customerId: dto.customerId,
            type: 'PAYMENT_RECEIVED',
            amount: dto.amount,
            balanceAfter: newBalance,
            description: dto.notes || `Payment via ${dto.method}`,
          },
        });
      }
    }

    return this.prisma.payment.create({
      data: {
        businessId,
        invoiceId: dto.invoiceId,
        customerId: dto.customerId,
        amount: dto.amount,
        method: dto.method,
        reference: dto.reference,
        notes: dto.notes,
      },
    });
  }

  async findOnePayment(businessId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, businessId },
      include: { customer: true, invoice: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async voidPayment(businessId: string, paymentId: string) {
    const payment = await this.findOnePayment(businessId, paymentId);
    if (payment.status === 'REFUNDED') throw new BadRequestException('Payment already refunded');

    if (payment.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({ where: { id: payment.invoiceId } });
      if (invoice) {
        await this.prisma.invoice.update({
          where: { id: payment.invoiceId },
          data: { paidAmount: Math.max(0, invoice.paidAmount - payment.amount) },
        });
      }
    }

    if (payment.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: payment.customerId } });
      if (customer) {
        await this.prisma.customer.update({
          where: { id: payment.customerId },
          data: { balance: customer.balance + payment.amount },
        });
      }
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED' },
    });
  }

  async refundPayment(businessId: string, paymentId: string, amount?: number) {
    const payment = await this.findOnePayment(businessId, paymentId);
    if (payment.status === 'REFUNDED') throw new BadRequestException('Payment already refunded');

    const refundAmount = amount || payment.amount;

    if (payment.method === 'RAZORPAY' && payment.reference && this.razorpay) {
      try {
        await this.razorpay.payments.refund(payment.reference, { amount: Math.round(refundAmount * 100) });
      } catch (error) {
        this.logger.error(`Razorpay refund failed: ${error.message}`);
      }
    }

    if (payment.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({ where: { id: payment.invoiceId } });
      if (invoice) {
        await this.prisma.invoice.update({
          where: { id: payment.invoiceId },
          data: { paidAmount: Math.max(0, invoice.paidAmount - refundAmount) },
        });
      }
    }

    if (payment.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: payment.customerId } });
      if (customer) {
        await this.prisma.customer.update({
          where: { id: payment.customerId },
          data: { balance: customer.balance + refundAmount },
        });
      }
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED' },
    });
  }

  async findAllPayments(businessId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { businessId },
        include: { customer: true, invoice: true },
        orderBy: { paidAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: { businessId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createRazorpayOrder(businessId: string, dto: CreateRazorpayOrderDto) {
    if (!this.razorpay) {
      throw new NotFoundException('Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    const options = {
      amount: Math.round(dto.amount * 100),
      currency: 'INR',
      receipt: dto.receipt || `receipt-${Date.now()}`,
    };

    const order = await this.razorpay.orders.create(options);

    await this.prisma.razorpayOrder.create({
      data: {
        businessId,
        invoiceId: dto.invoiceId,
        razorpayOrderId: order.id,
        amount: dto.amount,
        receipt: options.receipt,
        status: 'CREATED',
      },
    });

    return {
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
    };
  }

  async verifyRazorpayWebhook(body: any, signature: string) {
    this.logger.log('Razorpay webhook received');

    const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!secret) {
      throw new BadRequestException('Razorpay secret not configured');
    }

    const expectedSignature = crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body.event;

    if (event === 'payment.captured') {
      const payment = body.payload.payment.entity;
      const orderId = payment.order_id;

      const razorpayOrder = await this.prisma.razorpayOrder.findUnique({
        where: { razorpayOrderId: orderId },
      });

      if (razorpayOrder) {
        const businessId = razorpayOrder.businessId;
        await this.recordPayment(businessId, {
          invoiceId: razorpayOrder.invoiceId ?? undefined,
          amount: payment.amount / 100,
          method: 'RAZORPAY',
          reference: payment.id,
          notes: `Razorpay payment: ${payment.id}`,
        });

        await this.prisma.razorpayOrder.update({
          where: { id: razorpayOrder.id },
          data: { status: 'CAPTURED' },
        });
      }
    }

    return { received: true };
  }

  async generateUpiLink(businessId: string, amount: number, description?: string) {
    const upiId = this.configService.get<string>('UPI_ID', 'payment@upi');
    const upiLink = `upi://pay?pa=${upiId}&am=${amount}&tn=${encodeURIComponent(description || 'Payment')}&cu=INR`;
    return { upiLink, upiId, amount };
  }

  async reconcilePayments(businessId: string, entries: any[]) {
    const results = [];
    for (const entry of entries) {
      try {
        const payment = await this.prisma.payment.findFirst({
          where: { id: entry.paymentId, businessId },
        });
        if (!payment) {
          results.push({ paymentId: entry.paymentId, status: 'error', error: 'Payment not found' });
          continue;
        }

        let matchType = 'UNMATCHED';
        if (entry.invoiceId) {
          const invoice = await this.prisma.invoice.findFirst({
            where: { id: entry.invoiceId, businessId },
          });
          if (invoice) {
            const outstanding = invoice.grandTotal - invoice.paidAmount;
            if (entry.matchedAmount >= outstanding) {
              matchType = 'EXACT';
            } else if (entry.matchedAmount < outstanding) {
              matchType = 'PARTIAL';
            }

            await this.prisma.invoice.update({
              where: { id: entry.invoiceId },
              data: { paidAmount: invoice.paidAmount + entry.matchedAmount },
            });
          }
        }

        await this.prisma.reconciliationLog.create({
          data: {
            businessId,
            paymentId: entry.paymentId,
            invoiceId: entry.invoiceId,
            matchedAmount: entry.matchedAmount,
            matchType,
            notes: entry.notes,
          },
        });

        results.push({ paymentId: entry.paymentId, status: 'reconciled', matchType });
      } catch (error) {
        results.push({ paymentId: entry.paymentId, status: 'error', error: error.message });
      }
    }

    return {
      total: entries.length,
      reconciled: results.filter(r => r.status === 'reconciled').length,
      results,
    };
  }

  async autoReconcile(businessId: string, fromDate?: string, toDate?: string, tolerance: number = 0.01) {
    const where: any = { businessId, invoiceId: { not: null } };
    if (fromDate || toDate) {
      where.paidAt = {};
      if (fromDate) where.paidAt.gte = new Date(fromDate);
      if (toDate) where.paidAt.lte = new Date(toDate);
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: { invoice: true },
      orderBy: { paidAt: 'asc' },
    });

    const results = [];
    for (const payment of payments) {
      if (!payment.invoice) continue;

      const existingLog = await this.prisma.reconciliationLog.findFirst({
        where: { paymentId: payment.id },
      });
      if (existingLog) continue;

      const outstanding = payment.invoice.grandTotal - payment.invoice.paidAmount;
      const diff = Math.abs(payment.amount - outstanding);

      let matchType = 'UNMATCHED';
      if (diff <= tolerance) {
        matchType = 'EXACT';
      } else if (payment.amount < outstanding) {
        matchType = 'PARTIAL';
      }

      if (matchType !== 'UNMATCHED') {
        await this.prisma.invoice.update({
          where: { id: payment.invoiceId! },
          data: { paidAmount: payment.invoice.paidAmount + payment.amount },
        });

        await this.prisma.reconciliationLog.create({
          data: {
            businessId,
            paymentId: payment.id,
            invoiceId: payment.invoiceId,
            matchedAmount: payment.amount,
            matchType,
            notes: `Auto-reconciled (tolerance: ${tolerance})`,
          },
        });

        results.push({ paymentId: payment.id, invoiceId: payment.invoiceId, matchType, amount: payment.amount });
      }
    }

    return {
      total: payments.length,
      reconciled: results.length,
      results,
    };
  }

  async getReconciliationLogs(businessId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.reconciliationLog.findMany({
        where: { businessId },
        orderBy: { reconciledAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.reconciliationLog.count({ where: { businessId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async generatePaymentReceipt(businessId: string, paymentId: string): Promise<Buffer> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, businessId },
      include: { customer: true, invoice: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    const settings = (business?.settings as any) || {};

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const accent = settings.accentColor || '#1565c0';

      doc.rect(0, 0, doc.page.width, 80).fill(accent);
      doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('PAYMENT RECEIPT', 40, 20);
      doc.fontSize(10).font('Helvetica').text(`${business?.name || ''}`, 40, 48);
      if (business?.gstin) doc.text(`GSTIN: ${business.gstin}`, 40, 62);

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#333').text('Business Details', doc.page.width - 250, 15, { width: 210, align: 'right' });
      doc.fontSize(8).font('Helvetica');
      if (business?.address) doc.text(business.address, doc.page.width - 250, 30, { width: 210, align: 'right' });
      if (business?.city || business?.state) doc.text(`${business?.city || ''} ${business?.state || ''} ${business?.pincode || ''}`.trim(), doc.page.width - 250, 42, { width: 210, align: 'right' });
      if (business?.phone) doc.text(`Ph: ${business.phone}`, doc.page.width - 250, 54, { width: 210, align: 'right' });

      doc.fillColor(accent).rect(40, 95, doc.page.width - 80, 1).fill(accent);

      let y = 115;
      doc.fillColor(accent).rect(40, y, doc.page.width - 80, 18).fill(accent + '12');
      doc.fillColor(accent).fontSize(9).font('Helvetica-Bold').text('RECIPIENT DETAILS', 50, y + 4);
      y += 25;

      doc.fillColor('#333').font('Helvetica').fontSize(9);
      if (payment.customer) {
        doc.text(payment.customer.name || '', 50, y);
        if (payment.customer.phone) doc.text(`Ph: ${payment.customer.phone}`, 50, y + 14);
        if (payment.customer.email) doc.text(`Email: ${payment.customer.email}`, 50, y + 28);
        if (payment.customer.gstin) doc.text(`GSTIN: ${payment.customer.gstin}`, 50, y + 42);
      } else {
        doc.text('Walk-in Customer', 50, y);
      }

      y += 75;
      doc.fillColor(accent).rect(40, y, doc.page.width - 80, 18).fill(accent + '12');
      doc.fillColor(accent).fontSize(9).font('Helvetica-Bold').text('PAYMENT DETAILS', 50, y + 4);
      y += 28;

      const details: [string, string][] = [
        ['Receipt No', `RCP-${Date.now().toString(36).toUpperCase()}`],
        ['Payment Date', new Date(payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })],
        ['Payment Method', payment.method.replace('_', ' ')],
        ['Reference', payment.reference || '-'],
      ];

      if (payment.invoice) {
        details.push(['Invoice No', payment.invoice.invoiceNo]);
        details.push(['Invoice Total', `Rs. ${payment.invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
      }

      for (const [label, value] of details) {
        doc.fillColor('#666').fontSize(9).font('Helvetica').text(`${label}:`, 50, y, { width: 150 });
        doc.fillColor('#333').font('Helvetica-Bold').text(value, 200, y, { width: doc.page.width - 250 });
        y += 16;
      }

      y += 10;
      doc.rect(40, y, doc.page.width - 80, 50).fill('#e8f5e9');
      doc.rect(40, y, 5, 50).fill('#2e7d32');
      doc.fillColor('#2e7d32').fontSize(14).font('Helvetica-Bold').text('AMOUNT RECEIVED', 55, y + 8);
      doc.fillColor('#1b5e20').fontSize(22).font('Helvetica-Bold').text(`Rs. ${payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, y + 26, { width: doc.page.width - 100, align: 'left' });

      y += 70;
      if (payment.notes) {
        doc.fillColor('#333').font('Helvetica-Bold').fontSize(9).text('Notes:', 50, y);
        doc.font('Helvetica').fontSize(8).text(payment.notes, 50, y + 14, { width: doc.page.width - 100 });
        y += 30;
      }

      y += 20;
      doc.fillColor(accent).rect(40, y, doc.page.width - 80, 1).fill(accent);
      y += 10;
      doc.fillColor('#333').font('Helvetica-Bold').fontSize(9).text('Declaration', 50, y);
      doc.font('Helvetica').fontSize(8).fillColor('#666').text(
        'This is a computer-generated payment receipt. No signature is required. This receipt confirms that payment has been received as per the details mentioned above.',
        50, y + 14, { width: doc.page.width - 100 },
      );

      doc.fontSize(7).fillColor('#999').font('Helvetica')
        .text(`Generated by Wise Accounts | ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
          40, doc.page.height - 30, { width: doc.page.width - 80, align: 'center' });

      doc.end();
    });
  }
}
