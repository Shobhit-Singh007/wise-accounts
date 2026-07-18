import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { CustomerModule } from './customer/customer.module';
import { InventoryModule } from './inventory/inventory.module';
import { BillingModule } from './billing/billing.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SyncModule } from './sync/sync.module';
import { StaffModule } from './staff/staff.module';
import { RecurringInvoicesModule } from './recurring-invoices/recurring-invoices.module';
import { AwsModule } from './aws/aws.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ExportModule } from './export/export.module';
import { ImportModule } from './import/import.module';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AwsModule,
    PrismaModule,
    CommonModule,
    AuthModule,
    BusinessModule,
    CustomerModule,
    InventoryModule,
    BillingModule,
    PaymentsModule,
    ReportsModule,
    NotificationsModule,
    SyncModule,
    StaffModule,
    RecurringInvoicesModule,
    SubscriptionsModule,
    ExportModule,
    ImportModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
