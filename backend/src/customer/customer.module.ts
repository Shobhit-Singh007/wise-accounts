import { Module, forwardRef } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerGroupsController } from './customer-groups.controller';
import { CustomerService } from './customer.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [forwardRef(() => PaymentsModule)],
  controllers: [CustomerController, CustomerGroupsController],
  providers: [CustomerService],
})
export class CustomerModule {}
