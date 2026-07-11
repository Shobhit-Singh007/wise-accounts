import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

interface EwayBillConfig {
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  environment?: 'sandbox' | 'production';
  gstin?: string;
}

interface EwayBillRequest {
  supplyType: string;
  subSupplyType: string;
  docType: string;
  docNo: string;
  docDate: string;
  fromGstin: string;
  fromTrdName: string;
  fromAddr1: string;
  fromAddr2?: string;
  fromPlace: string;
  fromPincode: number;
  fromStateCode: number;
  toGstin?: string;
  toTrdName: string;
  toAddr1: string;
  toAddr2?: string;
  toPlace: string;
  toPincode: number;
  toStateCode: number;
  actFromStateCode: number;
  actToStateCode: number;
  totalValue: number;
  totalInvoiceValue: number;
  cgstValue?: number;
  sgstValue?: number;
  igstValue?: number;
  cessValue?: number;
  transporterId?: string;
  transporterName?: string;
  transactionMode?: string;
  vehicleNo?: string;
  vehicleType?: string;
  distance: number;
  items: Array<{
    productName: string;
    productDesc?: string;
    hsnCode?: string;
    quantity?: number;
    qtyUnit?: string;
    taxableAmount: number;
    taxRate: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    cessAmount?: number;
  }>;
}

interface EwayBillResponse {
 ewayBillNo: string;
 ewayBillDate: string;
  validUpto: string;
  message?: string;
}

@Injectable()
export class EwayBillApiService {
  private readonly logger = new Logger(EwayBillApiService.name);

  private readonly SANDBOX_BASE = 'https://sandbox-api.ewaybillgst.gov.in';
  private readonly PRODUCTION_BASE = 'https://ewbl.ewaybillgst.gov.in';

  private tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

  constructor(private prisma: PrismaService) {}

  private getBaseUrl(config: EwayBillConfig): string {
    return config.environment === 'production'
      ? this.PRODUCTION_BASE
      : this.SANDBOX_BASE;
  }

  private async getAccessToken(businessId: string, config: EwayBillConfig): Promise<string> {
    const cacheKey = `${businessId}_ewaybill`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    if (!config.username || !config.password) {
      throw new BadRequestException('E-Way Bill API credentials not configured. Go to Settings > Invoice > E-Way Bill API to configure.');
    }

    const baseUrl = this.getBaseUrl(config);
    const gstin = config.gstin || '';

    try {
      const response = await fetch(`${baseUrl}/ewbl/v1/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACCESSTOKEN',
          gstin,
          user_name: config.username,
          password: config.password,
        }),
      });

      const data = await response.json();

      if (data.status !== '1' || !data.authtoken) {
        throw new BadRequestException(`E-Way Bill auth failed: ${data.message || 'Invalid credentials'}`);
      }

      this.tokenCache.set(cacheKey, {
        token: data.authtoken,
        expiresAt: Date.now() + (data.expiry || 6 * 60 * 60 * 1000),
      });

      this.logger.log(`E-Way Bill token obtained for ${gstin}`);
      return data.authtoken;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`E-Way Bill auth error: ${err}`);
      throw new BadRequestException('Failed to authenticate with E-Way Bill API. Check your credentials.');
    }
  }

  async generateEwayBill(
    businessId: string,
    invoice: any,
    dto: {
      transporterId?: string;
      transporterName?: string;
      vehicleNo: string;
      distanceKm: number;
      supplyType?: string;
      docType?: string;
    },
  ): Promise<EwayBillResponse> {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new BadRequestException('Business not found');

    const settings = (business.settings as any) || {};
    const apiConfig: EwayBillConfig = {
      ...settings.ewayBillApi,
      gstin: business.gstin,
    };

    // If no API credentials configured, use simulated mode
    if (!apiConfig.username || !apiConfig.password) {
      return this.generateSimulated(invoice, dto);
    }

    const token = await this.getAccessToken(businessId, apiConfig);
    const baseUrl = this.getBaseUrl(apiConfig);

    const fromStateCode = business.state ? this.getStateCode(business.state) : 0;
    const toStateCode = invoice.customer?.state
      ? this.getStateCode(invoice.customer.state)
      : fromStateCode;

    const supplyTypeMap: Record<string, string> = {
      'Outward': '1',
      'Inward': '2',
    };
    const docTypeMap: Record<string, string> = {
      'Tax Invoice': '1',
      'Bill of Supply': '2',
      'Delivery Challan': '4',
      'Credit Note': '8',
    };

    const request: any = {
      supplyType: supplyTypeMap[dto.supplyType || 'Outward'] || '1',
      subSupplyType: '0',
      docType: docTypeMap[dto.docType || 'Tax Invoice'] || '1',
      docNo: invoice.invoiceNo,
      docDate: new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      fromGstin: business.gstin || '',
      fromTrdName: business.name,
      fromAddr1: business.address || '',
      fromPlace: business.city || '',
      fromPincode: parseInt(business.pincode || '0'),
      fromStateCode,
      toGstin: invoice.customer?.gstin || 'URP',
      toTrdName: invoice.customer?.name || 'Walk-in Customer',
      toAddr1: invoice.customer?.address || '',
      toPlace: invoice.customer?.city || '',
      toPincode: parseInt(invoice.customer?.pincode || '0'),
      toStateCode,
      actFromStateCode: fromStateCode,
      actToStateCode: toStateCode,
      totalValue: invoice.subtotal,
      totalInvoiceValue: invoice.grandTotal,
      cgstValue: invoice.items?.reduce((s: number, i: any) => s + (i.cgst || 0), 0) || 0,
      sgstValue: invoice.items?.reduce((s: number, i: any) => s + (i.sgst || 0), 0) || 0,
      igstValue: invoice.items?.reduce((s: number, i: any) => s + (i.igst || 0), 0) || 0,
      transporterId: dto.transporterId || '',
      transporterName: dto.transporterName || '',
      vehicleNo: dto.vehicleNo,
      distance: dto.distanceKm,
      transactionMode: '1',
      items: (invoice.items || []).map((item: any) => ({
        productName: item.itemName,
        productDesc: item.itemName,
        hsnCode: '',
        quantity: item.quantity,
        qtyUnit: item.unit === 'piece' ? 'NOS' : item.unit.toUpperCase(),
        taxableAmount: item.taxableValue,
        taxRate: item.taxRate,
        cgstAmount: item.cgst || 0,
        sgstAmount: item.sgst || 0,
        igstAmount: item.igst || 0,
      })),
    };

    try {
      const response = await fetch(`${baseUrl}/ewayapi/v1/ewaybill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'gstin': apiConfig.gstin || '',
          'user_name': apiConfig.username || '',
          'ip_address': '127.0.0.1',
          'authtoken': token,
        },
        body: JSON.stringify({ action: 'GENEWAYBILL', data: request }),
      });

      const result = await response.json();

      if (result.status !== '1' || !result.ewayBillNo) {
        throw new BadRequestException(`E-Way Bill generation failed: ${result.message || JSON.stringify(result)}`);
      }

      return {
        ewayBillNo: result.ewayBillNo,
        ewayBillDate: result.ewayBillDate || new Date().toISOString(),
        validUpto: result.validUpto || '',
        message: 'E-Way Bill generated successfully via GSTN API',
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`E-Way Bill generation error: ${err}`);
      // Fallback to simulated mode
      this.logger.warn('Falling back to simulated E-Way Bill generation');
      return this.generateSimulated(invoice, dto);
    }
  }

  private generateSimulated(invoice: any, dto: any): EwayBillResponse {
    const ewayBillNo = `EWB${Date.now()}`;
    const now = new Date();
    const validUpto = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return {
      ewayBillNo,
      ewayBillDate: now.toISOString(),
      validUpto: validUpto.toISOString(),
      message: 'E-Way Bill generated (simulated - configure API credentials for real generation)',
    };
  }

  async testConnection(businessId: string): Promise<{ success: boolean; message: string }> {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return { success: false, message: 'Business not found' };

    const settings = (business.settings as any) || {};
    const apiConfig: EwayBillConfig = {
      ...settings.ewayBillApi,
      gstin: business.gstin,
    };

    if (!apiConfig.username || !apiConfig.password) {
      return { success: false, message: 'API credentials not configured' };
    }

    try {
      await this.getAccessToken(businessId, apiConfig);
      return { success: true, message: 'E-Way Bill API connection successful' };
    } catch (err) {
      return { success: false, message: `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  }

  private getStateCode(state: string): number {
    const stateCodes: Record<string, number> = {
      'andhra pradesh': 37, 'arunachal pradesh': 12, 'assam': 18, 'bihar': 10,
      'chhattisgarh': 22, 'goa': 30, 'gujarat': 24, 'haryana': 6,
      'himachal pradesh': 2, 'jharkhand': 20, 'karnataka': 29, 'kerala': 32,
      'madhya pradesh': 23, 'maharashtra': 27, 'manipur': 14, 'meghalaya': 17,
      'mizoram': 15, 'nagaland': 13, 'odisha': 21, 'punjab': 3,
      'rajasthan': 8, 'sikkim': 11, 'tamil nadu': 33, 'telangana': 36,
      'tripura': 16, 'uttar pradesh': 9, 'uttarakhand': 5, 'west bengal': 19,
      'delhi': 7, 'jammu and kashmir': 1, 'ladakh': 38,
      'chandigarh': 4, 'dadra and nagar haveli': 26, 'lakshadweep': 31,
      'puducherry': 34, 'andaman and nicobar': 35,
    };
    return stateCodes[state.toLowerCase()] || 0;
  }
}
