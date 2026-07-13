import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { CreateRecurringInvoiceDto, UpdateRecurringInvoiceDto } from './dto/create-recurring-invoice.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';

@ApiTags('Recurring Invoices')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@Controller('businesses/:businessId/recurring-invoices')
export class RecurringInvoicesController {
  constructor(private readonly service: RecurringInvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a recurring invoice template' })
  async create(
    @Param('businessId') businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRecurringInvoiceDto,
  ) {
    return this.service.create(businessId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all recurring invoices' })
  async findAll(@Param('businessId') businessId: string) {
    return this.service.findAll(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recurring invoice details' })
  async findOne(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.service.findOne(businessId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update recurring invoice' })
  async update(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringInvoiceDto,
  ) {
    return this.service.update(businessId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete recurring invoice' })
  async remove(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.service.remove(businessId, id);
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle recurring invoice active status' })
  async toggleActive(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.service.toggleActive(businessId, id);
  }

  @Post('process-due')
  @ApiOperation({ summary: 'Process all due recurring invoices (admin/cron)' })
  async processDue() {
    return this.service.processDueRecurringInvoices();
  }
}
