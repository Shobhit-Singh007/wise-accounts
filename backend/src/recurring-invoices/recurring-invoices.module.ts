import { Module } from '@nestjs/common';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { RecurringInvoicesController } from './recurring-invoices.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecurringInvoicesController],
  providers: [RecurringInvoicesService],
  exports: [RecurringInvoicesService],
})
export class RecurringInvoicesModule {}
