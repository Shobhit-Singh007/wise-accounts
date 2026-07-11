import { Controller, Get, Post, Body, Param, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRazorpayOrderDto } from './dto/razorpay-order.dto';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(BusinessOwnershipGuard)
  @Post('businesses/:businessId/payments')
  @ApiOperation({ summary: 'Record a payment' })
  async recordPayment(@Param('businessId') businessId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.recordPayment(businessId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(BusinessOwnershipGuard)
  @Get('businesses/:businessId/payments')
  @ApiOperation({ summary: 'List all payments' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllPayments(
    @Param('businessId') businessId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.findAllPayments(businessId, page, limit);
  }

  @ApiBearerAuth()
  @UseGuards(BusinessOwnershipGuard)
  @Post('businesses/:businessId/payments/razorpay-order')
  @ApiOperation({ summary: 'Create Razorpay order for online payment' })
  async createRazorpayOrder(
    @Param('businessId') businessId: string,
    @Body() dto: CreateRazorpayOrderDto,
  ) {
    return this.paymentsService.createRazorpayOrder(businessId, dto);
  }

  @Public()
  @Post('payments/razorpay-webhook')
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  async razorpayWebhook(@Body() body: any, @Headers('x-razorpay-signature') signature: string) {
    return this.paymentsService.verifyRazorpayWebhook(body, signature);
  }

  @ApiBearerAuth()
  @UseGuards(BusinessOwnershipGuard)
  @Post('businesses/:businessId/payments/upi-link')
  @ApiOperation({ summary: 'Generate UPI payment link' })
  async generateUpiLink(
    @Param('businessId') businessId: string,
    @Body() body: { amount: number; description?: string },
  ) {
    return this.paymentsService.generateUpiLink(businessId, body.amount, body.description);
  }
}
