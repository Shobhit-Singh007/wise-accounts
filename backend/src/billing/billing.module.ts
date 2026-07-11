import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { EwayBillApiService } from './services/ewaybill-api.service';
import { EinvoiceApiService } from './services/einvoice-api.service';
import { InvoiceTemplatesService } from './services/invoice-templates.service';

@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    PrismaService,
    EwayBillApiService,
    EinvoiceApiService,
    InvoiceTemplatesService,
  ],
  exports: [BillingService],
})
export class BillingModule {}
