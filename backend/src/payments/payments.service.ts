import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRazorpayOrderDto } from './dto/razorpay-order.dto';
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
}
