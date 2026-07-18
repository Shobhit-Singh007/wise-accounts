import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';
import { ExportService } from './export.service';

@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@Controller('businesses/:businessId/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('customers')
  @ApiOperation({ summary: 'Export all customers as CSV or JSON' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'], description: 'Export format (default: csv)' })
  async exportCustomers(
    @Param('businessId') businessId: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const data = await this.exportService.exportCustomers(businessId);
    const isJson = format === 'json';
    const content = isJson ? this.exportService.toJson(data) : this.exportService.toCsv(data);
    const ext = isJson ? 'json' : 'csv';
    const mimeType = isJson ? 'application/json' : 'text/csv';

    res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="customers.${ext}"`);
    res.send(content);
  }

  @Get('products')
  @ApiOperation({ summary: 'Export all products as CSV or JSON' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'], description: 'Export format (default: csv)' })
  async exportProducts(
    @Param('businessId') businessId: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const data = await this.exportService.exportProducts(businessId);
    const isJson = format === 'json';
    const content = isJson ? this.exportService.toJson(data) : this.exportService.toCsv(data);
    const ext = isJson ? 'json' : 'csv';
    const mimeType = isJson ? 'application/json' : 'text/csv';

    res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="products.${ext}"`);
    res.send(content);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Export all invoices as CSV or JSON' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'], description: 'Export format (default: csv)' })
  @ApiQuery({ name: 'direction', required: false, enum: ['SALE', 'PURCHASE'], description: 'Filter by direction' })
  async exportInvoices(
    @Param('businessId') businessId: string,
    @Query('format') format: string,
    @Query('direction') direction: string,
    @Res() res: Response,
  ) {
    const data = await this.exportService.exportInvoices(businessId, direction || undefined);
    const isJson = format === 'json';
    const content = isJson ? this.exportService.toJson(data) : this.exportService.toCsv(data);
    const ext = isJson ? 'json' : 'csv';
    const mimeType = isJson ? 'application/json' : 'text/csv';

    res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="invoices.${ext}"`);
    res.send(content);
  }
}
