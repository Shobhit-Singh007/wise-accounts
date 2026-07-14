import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffController, StaffInviteController } from './staff.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [StaffController, StaffInviteController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
