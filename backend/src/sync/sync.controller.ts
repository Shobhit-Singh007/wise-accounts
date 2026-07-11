import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';

@ApiTags('Sync')
@ApiBearerAuth()
@Controller()
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @UseGuards(BusinessOwnershipGuard)
  @Post('businesses/:businessId/sync/push')
  @ApiOperation({ summary: 'Push offline changes to server' })
  async pushChanges(
    @Param('businessId') businessId: string,
    @Body() body: { deviceId: string; changes: any[] },
  ) {
    return this.syncService.pushChanges(businessId, body.deviceId, body.changes);
  }

  @UseGuards(BusinessOwnershipGuard)
  @Get('businesses/:businessId/sync/pull')
  @ApiOperation({ summary: 'Pull changes since last sync' })
  @ApiQuery({ name: 'lastSyncAt', required: false })
  async pullChanges(
    @Param('businessId') businessId: string,
    @Query('lastSyncAt') lastSyncAt?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.syncService.pullChanges(businessId, deviceId || 'unknown', lastSyncAt);
  }
}
