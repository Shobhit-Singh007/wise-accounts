import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

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

  @Get()
  @ApiOperation({ summary: 'Get in-app notifications for current user' })
  @ApiQuery({ name: 'isRead', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getNotifications(
    @Param('businessId') businessId: string,
    @CurrentUser() user: JwtPayload,
    @Query('isRead') isRead?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getNotifications(businessId, user.sub, {
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      page,
      limit,
    });
  }

  @Post(':notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @Param('businessId') businessId: string,
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationsService.markAsRead(businessId, user.sub, notificationId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @Param('businessId') businessId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationsService.markAllAsRead(businessId, user.sub);
  }

  @Delete(':notificationId')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(
    @Param('businessId') businessId: string,
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationsService.deleteNotification(businessId, user.sub, notificationId);
  }
}
