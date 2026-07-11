import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@Controller('businesses/:businessId/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('payment-reminder')
  @ApiOperation({ summary: 'Send payment reminder to customer' })
  async sendPaymentReminder(
    @Param('businessId') businessId: string,
    @Body() body: { customerId: string; amount: number; dueDate?: string },
  ) {
    return this.notificationsService.sendPaymentReminder(
      businessId,
      body.customerId,
      body.amount,
      body.dueDate ? new Date(body.dueDate) : undefined,
    );
  }

  @Post('low-stock-alert')
  @ApiOperation({ summary: 'Send low stock alert to business owner' })
  async sendLowStockAlert(
    @Param('businessId') businessId: string,
    @Body() body: { productName: string; currentStock: number; threshold: number },
  ) {
    return this.notificationsService.sendLowStockAlert(
      businessId,
      body.productName,
      body.currentStock,
      body.threshold,
    );
  }
}
