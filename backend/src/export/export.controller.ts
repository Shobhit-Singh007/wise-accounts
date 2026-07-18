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

  @Get('suppliers')
  @ApiOperation({ summary: 'Export all suppliers as CSV or JSON' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'], description: 'Export format (default: csv)' })
  async exportSuppliers(
    @Param('businessId') businessId: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const data = await this.exportService.exportSuppliers(businessId);
    const isJson = format === 'json';
    const content = isJson ? this.exportService.toJson(data) : this.exportService.toCsv(data);
    const ext = isJson ? 'json' : 'csv';
    const mimeType = isJson ? 'application/json' : 'text/csv';

    res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="suppliers.${ext}"`);
    res.send(content);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Export all payments as CSV or JSON' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'], description: 'Export format (default: csv)' })
  async exportPayments(
    @Param('businessId') businessId: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const data = await this.exportService.exportPayments(businessId);
    const isJson = format === 'json';
    const content = isJson ? this.exportService.toJson(data) : this.exportService.toCsv(data);
    const ext = isJson ? 'json' : 'csv';
    const mimeType = isJson ? 'application/json' : 'text/csv';

    res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="payments.${ext}"`);
    res.send(content);
  }

  @Get('selective')
  @ApiOperation({ summary: 'Export selected entities as CSV or JSON (for settings import/export)' })
  @ApiQuery({ name: 'entities', required: true, description: 'Comma-separated list: customers,products,invoices,suppliers,payments' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'], description: 'Export format (default: csv)' })
  async exportSelective(
    @Param('businessId') businessId: string,
    @Query('entities') entities: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const entityList = entities.split(',').map(e => e.trim().toLowerCase());
    const results: Record<string, { headers: string[]; rows: string[][] }> = {};

    for (const entity of entityList) {
      switch (entity) {
        case 'customers': results.customers = await this.exportService.exportCustomers(businessId); break;
        case 'products': results.products = await this.exportService.exportProducts(businessId); break;
        case 'invoices': results.invoices = await this.exportService.exportInvoices(businessId); break;
        case 'suppliers': results.suppliers = await this.exportService.exportSuppliers(businessId); break;
        case 'payments': results.payments = await this.exportService.exportPayments(businessId); break;
      }
    }

    const isJson = format === 'json';
    let content: string;
    let ext: string;
    let mimeType: string;

    if (isJson) {
      const jsonResult: Record<string, any[]> = {};
      for (const [key, data] of Object.entries(results)) {
        jsonResult[key] = data.rows.map(row => {
          const obj: Record<string, string> = {};
          data.headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
          return obj;
        });
      }
      content = JSON.stringify(jsonResult, null, 2);
      ext = 'json';
      mimeType = 'application/json';
    } else {
      // For CSV, combine all entities with section headers
      const lines: string[] = [];
      for (const [key, data] of Object.entries(results)) {
        lines.push(`--- ${key.toUpperCase()} ---`);
        lines.push(data.headers.join(','));
        data.rows.forEach(row => lines.push(row.join(',')));
        lines.push('');
      }
      content = '\uFEFF' + lines.join('\n');
      ext = 'csv';
      mimeType = 'text/csv';
    }

    res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="export.${ext}"`);
    res.send(content);
  }
}
