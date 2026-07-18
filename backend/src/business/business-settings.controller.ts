import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';

@ApiTags('Business Settings')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@Controller('businesses/:businessId/settings')
export class BusinessSettingsController {
  constructor(private prisma: PrismaService) {}

  private async getSettings(businessId: string): Promise<Record<string, any>> {
    const biz = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    return (biz.settings as Record<string, any>) || {};
  }

  private async updateSettings(businessId: string, patch: Record<string, any>): Promise<Record<string, any>> {
    const current = await this.getSettings(businessId);
    const merged = { ...current, ...patch };
    await this.prisma.business.update({ where: { id: businessId }, data: { settings: merged } });
    return merged;
  }

  @Get('tax')
  @ApiOperation({ summary: 'Get tax settings' })
  async getTaxSettings(@Param('businessId') businessId: string) {
    const s = await this.getSettings(businessId);
    return { defaultTaxRate: s.tax?.defaultTaxRate ?? 18, taxDisplayMode: s.tax?.taxDisplayMode ?? 'inclusive' };
  }

  @Put('tax')
  @ApiOperation({ summary: 'Update tax settings' })
  async updateTaxSettings(@Param('businessId') businessId: string, @Body() dto: any) {
    const s = await this.getSettings(businessId);
    const tax = { ...(s.tax || {}), ...dto };
    await this.updateSettings(businessId, { tax });
    return tax;
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification settings' })
  async getNotificationSettings(@Param('businessId') businessId: string) {
    const s = await this.getSettings(businessId);
    return { emailNotifications: s.notifications?.emailNotifications ?? true, smsNotifications: s.notifications?.smsNotifications ?? false };
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Update notification settings' })
  async updateNotificationSettings(@Param('businessId') businessId: string, @Body() dto: any) {
    const s = await this.getSettings(businessId);
    const notifications = { ...(s.notifications || {}), ...dto };
    await this.updateSettings(businessId, { notifications });
    return notifications;
  }

  @Get('api-credentials')
  @ApiOperation({ summary: 'Get API credentials' })
  async getApiCredentials(@Param('businessId') businessId: string) {
    const s = await this.getSettings(businessId);
    return s.apiCredentials || {};
  }

  @Put('api-credentials')
  @ApiOperation({ summary: 'Update API credentials' })
  async updateApiCredentials(@Param('businessId') businessId: string, @Body() dto: any) {
    const s = await this.getSettings(businessId);
    const apiCredentials = { ...(s.apiCredentials || {}), ...dto };
    await this.updateSettings(businessId, { apiCredentials });
    return apiCredentials;
  }
}
