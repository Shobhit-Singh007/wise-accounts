import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { GenerateEwayBillDto } from './dto/generate-ewaybill.dto';
import { GenerateEinvoiceDto } from './dto/generate-einvoice.dto';
import { GenerateBothDto } from './dto/generate-both.dto';
import { InvoiceSettingsDto } from './dto/invoice-settings.dto';
import { BulkCreateInvoiceDto } from './dto/bulk-create-invoice.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@Controller('businesses/:businessId/invoices')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice with GST calculation' })
  async create(
    @Param('businessId') businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.billingService.createInvoice(businessId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices with optional filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'direction', required: false, enum: ['SALE', 'PURCHASE'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Param('businessId') businessId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('direction') direction?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.billingService.findAllInvoices(businessId, { status, customerId, direction, page, limit });
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get invoice settings for business' })
  async getSettings(@Param('businessId') businessId: string) {
    return this.billingService.getInvoiceSettings(businessId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update invoice settings' })
  async updateSettings(@Param('businessId') businessId: string, @Body() dto: InvoiceSettingsDto) {
    return this.billingService.updateInvoiceSettings(businessId, dto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get available invoice templates' })
  async getTemplates() {
    return this.billingService.getTemplates();
  }

  @Get(':invoiceId')
  @ApiOperation({ summary: 'Get invoice details' })
  async findOne(@Param('businessId') businessId: string, @Param('invoiceId') invoiceId: string) {
    return this.billingService.findOneInvoice(businessId, invoiceId);
  }

  @Put(':invoiceId')
  @ApiOperation({ summary: 'Update an invoice' })
  async update(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.billingService.updateInvoice(businessId, invoiceId, dto);
  }

  @Delete(':invoiceId')
  @ApiOperation({ summary: 'Delete a draft invoice' })
  async remove(@Param('businessId') businessId: string, @Param('invoiceId') invoiceId: string) {
    return this.billingService.deleteInvoice(businessId, invoiceId);
  }

  @Post(':invoiceId/cancel')
  @ApiOperation({ summary: 'Cancel an invoice' })
  async cancel(@Param('businessId') businessId: string, @Param('invoiceId') invoiceId: string) {
    return this.billingService.cancelInvoice(businessId, invoiceId);
  }

  @Post(':invoiceId/eway-bill')
  @ApiOperation({ summary: 'Generate E-Way Bill for an invoice (real GSTN API or simulated)' })
  async generateEwayBill(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: GenerateEwayBillDto,
  ) {
    return this.billingService.generateEwayBill(businessId, invoiceId, dto);
  }

  @Post(':invoiceId/e-invoice')
  @ApiOperation({ summary: 'Generate e-Invoice (IRN) for an invoice (real GSTN API or simulated)' })
  async generateEinvoice(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: GenerateEinvoiceDto,
  ) {
    return this.billingService.generateEinvoice(businessId, invoiceId, dto);
  }

  @Post(':invoiceId/generate-both')
  @ApiOperation({ summary: 'Generate both E-Way Bill and e-Invoice in one click' })
  async generateBoth(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: GenerateBothDto,
  ) {
    return this.billingService.generateBoth(businessId, invoiceId, dto);
  }

  @Get(':invoiceId/pdf')
  @ApiOperation({ summary: 'Download invoice as PDF (supports template and document type selection)' })
  @ApiQuery({ name: 'template', required: false, description: 'Template ID for PDF styling' })
  @ApiQuery({ name: 'documentType', required: false, enum: ['INVOICE', 'QUOTATION', 'PROFORMA', 'DELIVERY_CHALLAN', 'JOBWORK', 'CREDIT_NOTE', 'LETTERHEAD'], description: 'Document type for PDF rendering' })
  async getPdf(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
    @Query('template') template?: string,
    @Query('documentType') documentType?: string,
    @Res() res?: Response,
  ) {
    const invoice = await this.billingService.findOneInvoice(businessId, invoiceId);
    const docType = (documentType as any) || (invoice as any).documentType || 'INVOICE';
    const pdf = await this.billingService.getInvoicePdf(businessId, invoiceId, template, docType);
    const safeName = (invoice.invoiceNo || 'Invoice').replace(/[^a-zA-Z0-9]/g, '_');
    res!.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
      'Content-Length': pdf.length,
    });
    res!.send(pdf);
  }

  @Get(':invoiceId/print')
  @ApiOperation({ summary: 'Get invoice as printable HTML (supports template and document type selection)' })
  @ApiQuery({ name: 'template', required: false, description: 'Template ID for HTML styling' })
  @ApiQuery({ name: 'documentType', required: false, enum: ['INVOICE', 'QUOTATION', 'PROFORMA', 'DELIVERY_CHALLAN', 'JOBWORK', 'CREDIT_NOTE', 'LETTERHEAD'], description: 'Document type for HTML rendering' })
  async getPrint(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
    @Query('template') template?: string,
    @Query('documentType') documentType?: string,
    @Res() res?: Response,
  ) {
    const invoice = await this.billingService.findOneInvoice(businessId, invoiceId);
    const docType = (documentType as any) || (invoice as any).documentType || 'INVOICE';
    const html = await this.billingService.getInvoicePrintHtml(businessId, invoiceId, template, docType);
    res!.set({ 'Content-Type': 'text/html' });
    res!.send(html);
  }

  @Post('credit-note')
  @ApiOperation({ summary: 'Create credit note against an invoice' })
  async createCreditNote(
    @Param('businessId') businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCreditNoteDto,
  ) {
    return this.billingService.createCreditNote(businessId, user.sub, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple invoices in bulk' })
  async bulkCreate(
    @Param('businessId') businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkCreateInvoiceDto,
  ) {
    return this.billingService.bulkCreateInvoices(businessId, user.sub, dto.invoices);
  }

  @Post(':invoiceId/share')
  @ApiOperation({ summary: 'Share invoice via SMS, Email, or WhatsApp' })
  async shareInvoice(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: { method: 'email' | 'sms' | 'whatsapp'; recipientPhone?: string; recipientEmail?: string; message?: string },
  ) {
    return this.billingService.shareInvoice(businessId, invoiceId, dto);
  }
}
