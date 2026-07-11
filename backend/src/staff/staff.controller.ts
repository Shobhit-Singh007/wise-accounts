import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Staff Management')
@ApiBearerAuth()
@Controller('businesses/:businessId/staff')
@UseGuards(BusinessOwnershipGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Invite a staff member to the business' })
  async invite(
    @Param('businessId') businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteStaffDto,
  ) {
    return this.staffService.invite(businessId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all staff members' })
  async listStaff(@Param('businessId') businessId: string) {
    return this.staffService.listStaff(businessId);
  }

  @Put(':userId/permissions')
  @ApiOperation({ summary: 'Update staff member permissions' })
  async updatePermissions(
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.staffService.updatePermissions(businessId, userId, dto, user.sub);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Remove a staff member from the business' })
  async removeStaff(
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.staffService.removeStaff(businessId, userId, user.sub);
  }

  @Get('invites')
  @ApiOperation({ summary: 'List pending invitations' })
  async listInvites(@Param('businessId') businessId: string) {
    return this.staffService.listPendingInvites(businessId);
  }

  @Delete('invites/:inviteId')
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  async cancelInvite(
    @Param('businessId') businessId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.staffService.cancelInvite(businessId, inviteId, user.sub);
  }
}

@ApiTags('Staff Management')
@ApiBearerAuth()
@Controller('staff')
export class StaffInviteController {
  constructor(private readonly staffService: StaffService) {}

  @Post('accept-invite/:token')
  @ApiOperation({ summary: 'Accept a staff invitation' })
  async acceptInvite(
    @Param('token') token: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.staffService.acceptInvite(token, user.sub);
  }

  @Get('permission-presets')
  @ApiOperation({ summary: 'Get available role presets and permissions' })
  async getPresets() {
    return this.staffService.getPermissionPresets();
  }
}
