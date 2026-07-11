import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffController, StaffInviteController } from './staff.controller';

@Module({
  controllers: [StaffController, StaffInviteController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
