import { Controller, Get, Post, Body, Param, Headers, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRazorpayOrderDto } from './dto/razorpay-order.dto';
import { ReconcilePaymentsDto, AutoReconcileDto } from './dto/reconcile-payments.dto';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(BusinessOwnershipGuard)
  @Get('businesses/:businessId/payments/:paymentId')
  @ApiOperation({ summary: 'Get payment by ID' })
  async findOnePayment(@Param('businessId') businessId: string, @Param('paymentId') paymentId: string) {
    return this.paymentsService.findOnePayment(businessId, paymentId);
  }

  @ApiBearerAuth()
  @UseGuards(BusinessOwnershipGuard)
  @Post('businesses/:businessId/payments/:paymentId/void')
  @ApiOperation({ summary: 'Void a payment' })
  async voidPayment(@Param('businessId') businessId: string, @Param('paymentId') paymentId: string) {
    return this.paymentsService.voidPayment(businessId, paymentId);
  }

  @ApiBearerAuth()
  @UseGuards(BusinessOwnershipGuard)
  @Post('businesses/:businessId/payments/:paymentId/refund')
  @ApiOperation({ summary: 'Refund a payment' })
  async refundPayment(
    @Param('businessId') businessId: string,
    @Param('paymentId') paymentId: string,
    @Body() body: { amount?: number },
  ) {
    return this.paymentsService.refundPayment(businessId, paymentId, body.amount);
  }

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

  @ApiBearerAuth()
  @UseGuards(BusinessOwnershipGuard)
  @Post('businesses/:businessId/payments/reconcile')
  @ApiOperation({ summary: 'Manually reconcile payments against invoices' })
  async reconcilePayments(
    @Param('businessId') businessId: string,
    @Body() dto: ReconcilePaymentsDto,
  ) {
    return this.paymentsService.reconcilePayments(businessId, dto.entries);
  }

  @ApiBearerAuth()
  @UseGuards(BusinessOwnershipGuard)
  @Post('businesses/:businessId/payments/auto-reconcile')
  @ApiOperation({ summary: 'Auto-reconcile payments by matching amounts' })
  async autoReconcile(
    @Param('businessId') businessId: string,
    @Body() dto: AutoReconcileDto,
  ) {
    return this.paymentsService.autoReconcile(businessId, dto.fromDate, dto.toDate, dto.tolerance);
  }

  @ApiBearerAuth()
  @UseGuards(BusinessOwnershipGuard)
  @Get('businesses/:businessId/payments/reconciliation-logs')
  @ApiOperation({ summary: 'Get reconciliation logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getReconciliationLogs(
    @Param('businessId') businessId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.getReconciliationLogs(businessId, page, limit);
  }

  @ApiBearerAuth()
  @UseGuards(BusinessOwnershipGuard)
  @Get('businesses/:businessId/payments/:paymentId/receipt')
  @ApiOperation({ summary: 'Download payment receipt as PDF' })
  async getPaymentReceipt(
    @Param('businessId') businessId: string,
    @Param('paymentId') paymentId: string,
    @Res() res?: Response,
  ) {
    const pdf = await this.paymentsService.generatePaymentReceipt(businessId, paymentId);
    res!.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${paymentId.slice(0, 8)}.pdf"`,
      'Content-Length': pdf.length,
    });
    res!.send(pdf);
  }
}
