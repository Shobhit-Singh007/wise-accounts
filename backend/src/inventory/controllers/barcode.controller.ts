import { Controller, Get, Put, Post, Param, Body, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BarcodeService } from '../services/barcode.service';
import { BusinessOwnershipGuard } from '../../common/guards/business-ownership.guard';

@ApiTags('Barcode & QR Code')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@Controller('businesses/:businessId')
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Get('products/:productId/barcode')
  @ApiOperation({ summary: 'Generate barcode SVG for a product' })
  async getProductBarcode(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Res() res: Response,
  ) {
    const { barcode, svg } = await this.barcodeService.generateProductBarcode(businessId, productId);
    res.set({ 'Content-Type': 'image/svg+xml' });
    res.send(svg);
  }

  @Get('products/:productId/qrcode')
  @ApiOperation({ summary: 'Generate QR code for a product' })
  async getProductQrCode(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ) {
    return this.barcodeService.generateProductQrCode(businessId, productId);
  }

  @Get('invoices/:invoiceId/qrcode')
  @ApiOperation({ summary: 'Generate QR code for an invoice' })
  async getInvoiceQrCode(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.barcodeService.generateInvoiceQrCode(businessId, invoiceId);
  }

  @Get('invoices/:invoiceId/gst-qr')
  @ApiOperation({ summary: 'Generate GST-compliant UPI QR code for an invoice payment' })
  async getGstCompliantInvoiceQrCode(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.barcodeService.generateGstCompliantInvoiceQrCode(businessId, invoiceId);
  }

  @Put('products/:productId/barcode')
  @ApiOperation({ summary: 'Update product barcode value' })
  async updateProductBarcode(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() body: { barcode: string },
  ) {
    return this.barcodeService.updateProductBarcode(businessId, productId, body.barcode);
  }

  @Post('products/batch-generate-barcodes')
  @ApiOperation({ summary: 'Batch generate barcodes for products without one' })
  async batchGenerateBarcodes(@Param('businessId') businessId: string) {
    return this.barcodeService.batchGenerateBarcodes(businessId);
  }
}
