import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessSettingsController } from './business-settings.controller';
import { BusinessService } from './business.service';

@Module({
  controllers: [BusinessController, BusinessSettingsController],
  providers: [BusinessService]
})
export class BusinessModule {}
