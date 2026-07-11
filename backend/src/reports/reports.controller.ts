import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@Controller('businesses/:businessId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSalesReport(
    @Param('businessId') businessId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesReport(businessId, startDate, endDate);
  }

  @Get('gstr-1')
  @ApiOperation({ summary: 'Get GSTR-1 report for outward supplies' })
  async getGstr1(
    @Param('businessId') businessId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.reportsService.getGstr1(businessId, fromDate, toDate);
  }

  @Get('gstr-3b')
  @ApiOperation({ summary: 'Get GSTR-3B summary return' })
  async getGstr3b(
    @Param('businessId') businessId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.reportsService.getGstr3b(businessId, parseInt(month), parseInt(year));
  }

  @Get('hsn')
  @ApiOperation({ summary: 'Get HSN-wise summary for GST returns' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getHsnReport(
    @Param('businessId') businessId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reportsService.getHsnReport(businessId, fromDate, toDate);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customer-wise report' })
  async getCustomerReport(@Param('businessId') businessId: string) {
    return this.reportsService.getCustomerReport(businessId);
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Get profit & loss statement' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getProfitLoss(
    @Param('businessId') businessId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getProfitLoss(businessId, startDate, endDate);
  }
}
