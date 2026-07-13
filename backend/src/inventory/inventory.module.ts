import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { BarcodeService } from './services/barcode.service';
import { BarcodeController } from './controllers/barcode.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController, BarcodeController],
  providers: [InventoryService, BarcodeService],
  exports: [BarcodeService],
})
export class InventoryModule {}
