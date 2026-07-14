import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('create-order')
  @HttpCode(HttpStatus.OK)
  async createOrder(@Body() body: { plan: string }) {
    return this.subscriptionsService.createOrder(body.plan || 'business');
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Body() body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    plan: string;
  }) {
    return this.subscriptionsService.verifyPayment(body);
  }
}
