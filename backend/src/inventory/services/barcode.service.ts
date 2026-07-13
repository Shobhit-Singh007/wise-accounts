import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import QRCode from 'qrcode';

@Injectable()
export class BarcodeService {
  constructor(private prisma: PrismaService) {}

  async generateProductBarcode(businessId: string, productId: string): Promise<{ barcode: string; svg: string }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const barcodeValue = product.barcode || product.sku || product.id;
    const svg = await QRCode.toString(barcodeValue, { type: 'svg', width: 300, margin: 2 });

    return { barcode: barcodeValue, svg };
  }

  async generateProductQrCode(businessId: string, productId: string): Promise<{ qrData: string; svg: string; dataUrl: string }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const qrData = JSON.stringify({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.sellingPrice,
      tax: product.taxRate,
    });

    const svg = await QRCode.toString(qrData, { type: 'svg', width: 300, margin: 2 });
    const dataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });

    return { qrData, svg, dataUrl };
  }

  async generateInvoiceQrCode(businessId: string, invoiceId: string): Promise<{ qrData: string; svg: string; dataUrl: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: { business: true, customer: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const qrData = JSON.stringify({
      invoiceNo: invoice.invoiceNo,
      date: invoice.invoiceDate.toISOString(),
      total: invoice.grandTotal,
      GSTIN: invoice.business.gstin || '',
      customer: invoice.customer?.name || 'Walk-in',
    });

    const svg = await QRCode.toString(qrData, { type: 'svg', width: 300, margin: 2 });
    const dataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });

    return { qrData, svg, dataUrl };
  }

  async generateGstCompliantInvoiceQrCode(
    businessId: string,
    invoiceId: string,
  ): Promise<{ upiString: string; svg: string; dataUrl: string; qrPayload: object }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: { business: true, customer: true, items: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const settings = (invoice.business.settings as any) || {};
    const upiId = settings.upiId || '';
    if (!upiId) {
      throw new NotFoundException('UPI ID not configured. Set UPI ID in invoice settings.');
    }

    const balanceDue = invoice.grandTotal - (invoice.paidAmount || 0);

    const qrPayload = {
      invoiceno: invoice.invoiceNo,
      invoicedate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
      buyerGstin: invoice.customer?.gstin || '',
      sellerGstin: invoice.business.gstin || '',
      placeofsupply: invoice.customer?.state || invoice.business.state || '',
      totalvalue: invoice.grandTotal,
      taxablevalue: invoice.subtotal,
      cgst: invoice.items.reduce((sum, i) => sum + i.cgst, 0),
      sgst: invoice.items.reduce((sum, i) => sum + i.sgst, 0),
      igst: invoice.items.reduce((sum, i) => sum + i.igst, 0),
      totaltax: invoice.taxAmount,
      balancedue: balanceDue,
      irn: invoice.irn || '',
      ewaybillno: invoice.ewayBillNo || '',
    };

    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(invoice.business.name || '')}&am=${balanceDue.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoice.invoiceNo}`)}`;

    const svg = await QRCode.toString(upiString, { type: 'svg', width: 400, margin: 2, errorCorrectionLevel: 'M' });
    const dataUrl = await QRCode.toDataURL(upiString, { width: 400, margin: 2, errorCorrectionLevel: 'M' });

    return { upiString, svg, dataUrl, qrPayload };
  }

  async updateProductBarcode(businessId: string, productId: string, barcode: string): Promise<{ barcode: string }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.update({
      where: { id: productId },
      data: { barcode },
    });

    return { barcode };
  }

  async batchGenerateBarcodes(businessId: string): Promise<{ generated: number; products: Array<{ id: string; name: string; barcode: string }> }> {
    const products = await this.prisma.product.findMany({
      where: { businessId, barcode: null, isActive: true },
      take: 100,
    });

    const results = [];
    for (const product of products) {
      const barcode = `GST${businessId.slice(0, 4).toUpperCase()}${product.id.slice(0, 8).toUpperCase()}`;
      await this.prisma.product.update({
        where: { id: product.id },
        data: { barcode },
      });
      results.push({ id: product.id, name: product.name, barcode });
    }

    return { generated: results.length, products: results };
  }
}
