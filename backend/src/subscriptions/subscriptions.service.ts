import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private razorpay: any;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const keyId = this.config.get('RAZORPAY_KEY_ID');
    const keySecret = this.config.get('RAZORPAY_KEY_SECRET');
    if (keyId && keySecret) {
      try {
        const Razorpay = require('razorpay');
        this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      } catch {
        this.logger.warn('Razorpay SDK not installed. Subscriptions unavailable.');
      }
    }
  }

  async createOrder(plan: string) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    const amount = plan === 'business' ? 49900 : 0;
    const order = await this.razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `sub_${plan}_${Date.now()}`,
    });

    return {
      order_id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      key_id: this.config.get('RAZORPAY_KEY_ID'),
    };
  }

  async verifyPayment(body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    plan: string;
  }) {
    const keySecret = this.config.get('RAZORPAY_KEY_SECRET');
    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== body.razorpay_signature) {
      throw new Error('Payment verification failed');
    }

    this.logger.log(`Payment verified for order ${body.razorpay_order_id}, payment ${body.razorpay_payment_id}`);

    return {
      verified: true,
      plan: body.plan,
      order_id: body.razorpay_order_id,
      payment_id: body.razorpay_payment_id,
    };
  }
}
