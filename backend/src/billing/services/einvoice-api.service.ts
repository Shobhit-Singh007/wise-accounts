import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

interface EinvoiceConfig {
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  environment?: 'sandbox' | 'production';
  gstin?: string;
}

interface EinvoiceResponse {
  irn: string;
  irnDate: string;
  ackNo: string;
  ackDate: string;
  qrCode?: string;
  einvoiceStatus?: string;
  message?: string;
}

@Injectable()
export class EinvoiceApiService {
  private readonly logger = new Logger(EinvoiceApiService.name);

  private readonly SANDBOX_BASE = 'https://einv-apisandbox.cbic.gov.in';
  private readonly PRODUCTION_BASE = 'https://einvoice1.gst.gov.in';

  private tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

  constructor(private prisma: PrismaService) {}

  private getBaseUrl(config: EinvoiceConfig): string {
    return config.environment === 'production'
      ? this.PRODUCTION_BASE
      : this.SANDBOX_BASE;
  }

  private async getAccessToken(businessId: string, config: EinvoiceConfig): Promise<{ token: string; sekKey: string }> {
    const cacheKey = `${businessId}_einvoice`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { token: cached.token, sekKey: '' };
    }

    if (!config.username || !config.password || !config.clientId || !config.clientSecret) {
      throw new BadRequestException('e-Invoice API credentials not configured. Go to Settings > Invoice > e-Invoice API to configure.');
    }

    const baseUrl = this.getBaseUrl(config);
    const gstin = config.gstin || '';

    try {
      const response = await fetch(`${baseUrl}/eivital/auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACCESSTOKEN',
          username: config.username,
          password: config.password,
          clientid: config.clientId,
          client_secret: config.clientSecret,
          gstin,
          ip_address: '127.0.0.1',
        }),
      });

      const data = await response.json();

      if (data.Status !== 1 || !data.AccessToken) {
        throw new BadRequestException(`e-Invoice auth failed: ${data.Message || 'Invalid credentials'}`);
      }

      const token = data.AccessToken;
      const expiry = data.Expires_in || 3600;

      this.tokenCache.set(cacheKey, {
        token,
        expiresAt: Date.now() + (expiry * 1000),
      });

      this.logger.log(`e-Invoice token obtained for ${gstin}`);
      return { token, sekKey: data.SekKey || '' };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`e-Invoice auth error: ${err}`);
      throw new BadRequestException('Failed to authenticate with e-Invoice API. Check your credentials.');
    }
  }

  async generateEinvoice(
    businessId: string,
    invoice: any,
    dto?: { irn?: string; ackNo?: string; ackDate?: string },
  ): Promise<EinvoiceResponse> {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new BadRequestException('Business not found');

    const settings = (business.settings as any) || {};
    const apiConfig: EinvoiceConfig = {
      ...settings.einvoiceApi,
      gstin: business.gstin,
    };

    // If no API credentials configured, use simulated mode
    if (!apiConfig.username || !apiConfig.password || !apiConfig.clientId || !apiConfig.clientSecret) {
      return this.generateSimulated(business, invoice, dto);
    }

    const { token } = await this.getAccessToken(businessId, apiConfig);
    const baseUrl = this.getBaseUrl(apiConfig);

    const fromStateCode = business.state ? this.getStateCode(business.state) : 0;
    const toStateCode = invoice.customer?.state
      ? this.getStateCode(invoice.customer.state)
      : fromStateCode;

    const isInterState = fromStateCode !== toStateCode;

    // Build GSTN e-Invoice JSON (simplified schema version)
    const einvoiceData = {
      Version: '1.1',
      TranDtls: {
        TaxSch: 'GST',
        SupTyp: isInterState ? 'INTER' : 'INTRA',
        RegRev: 'N',
        IgstOnIntra: 'N',
      },
      DocDtls: {
        Typ: 'INV',
        No: invoice.invoiceNo,
        Dt: new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      },
      SellerDtls: {
        Gstin: business.gstin,
        LglNm: business.name,
        Addr1: business.address || '',
        Loc: business.city || '',
        Pin: parseInt(business.pincode || '0'),
        Stcd: String(fromStateCode).padStart(2, '0'),
      },
      BuyerDtls: {
        Gstin: invoice.customer?.gstin || 'URP',
        LglNm: invoice.customer?.name || 'Walk-in Customer',
        Addr1: invoice.customer?.address || '',
        Loc: invoice.customer?.city || '',
        Pin: parseInt(invoice.customer?.pincode || '0'),
        Stcd: String(toStateCode).padStart(2, '0'),
        Pos: String(toStateCode).padStart(2, '0'),
      },
      ItemList: (invoice.items || []).map((item: any, idx: number) => {
        const cgstAmt = item.cgst || 0;
        const sgstAmt = item.sgst || 0;
        const igstAmt = item.igst || 0;
        return {
          SlNo: String(idx + 1),
          PrdDesc: item.itemName,
          HsnCd: '',
          Qty: item.quantity,
          Unit: item.unit === 'piece' ? 'NOS' : item.unit.toUpperCase(),
          UnitPrice: item.rate,
          TotAmt: item.quantity * item.rate,
          Discount: item.discount || 0,
          PreTaxVal: item.taxableValue,
          AssAmt: item.taxableValue,
          GstRt: item.taxRate,
          CgstAmt: cgstAmt,
          SgstAmt: sgstAmt,
          IgstAmt: igstAmt,
          TotItemVal: item.total,
        };
      }),
      ValDtls: {
        AssVal: invoice.subtotal,
        CgstVal: invoice.items?.reduce((s: number, i: any) => s + (i.cgst || 0), 0) || 0,
        SgstVal: invoice.items?.reduce((s: number, i: any) => s + (i.sgst || 0), 0) || 0,
        IgstVal: invoice.items?.reduce((s: number, i: any) => s + (i.igst || 0), 0) || 0,
        DiscVal: invoice.discount || 0,
        OthChrg: 0,
        RndOffAmt: invoice.roundOff || 0,
        TotInvVal: invoice.grandTotal,
      },
      PayDtls: {
        Nm: '',
        AccNo: settings.bankAccountNo || '',
        Ifsc: settings.bankIfsc || '',
        Mode: '',
      },
    };

    try {
      const response = await fetch(`${baseUrl}/eicore/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'gstin': apiConfig.gstin || '',
          'user_name': apiConfig.username || '',
          'ip_address': '127.0.0.1',
          'authtoken': token,
        },
        body: JSON.stringify({ data: einvoiceData }),
      });

      const result = await response.json();

      if (result.Status !== 1 || !result.Irn) {
        throw new BadRequestException(`e-Invoice generation failed: ${result.Message || JSON.stringify(result)}`);
      }

      return {
        irn: result.Irn,
        irnDate: result.IrnDate || new Date().toISOString(),
        ackNo: String(result.AckNo || ''),
        ackDate: result.AckDt || new Date().toISOString(),
        qrCode: result.QrCode || '',
        einvoiceStatus: result.EinvoiceStatus || 'ACT',
        message: 'e-Invoice generated successfully via GSTN API',
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`e-Invoice generation error: ${err}`);
      // Fallback to simulated mode
      this.logger.warn('Falling back to simulated e-Invoice generation');
      return this.generateSimulated(business, invoice, dto);
    }
  }

  private generateSimulated(business: any, invoice: any, dto?: { irn?: string; ackNo?: string; ackDate?: string }): EinvoiceResponse {
    if (dto?.irn) {
      return {
        irn: dto.irn,
        irnDate: dto.ackDate || new Date().toISOString(),
        ackNo: dto.ackNo || '',
        ackDate: dto.ackDate || new Date().toISOString(),
        qrCode: Buffer.from(JSON.stringify({ irn: dto.irn, invoiceNo: invoice.invoiceNo, total: invoice.grandTotal })).toString('base64'),
        message: 'e-Invoice recorded (manual entry - configure API credentials for real generation)',
      };
    }

    const irnData = `${business?.gstin || ''}|${invoice.invoiceNo}|${new Date(invoice.invoiceDate).toISOString().split('T')[0]}|${business?.gstin || ''}|${invoice.grandTotal}`;
    const irn = crypto.createHash('sha256').update(irnData).digest('hex').toUpperCase().substring(0, 64);
    const ackNo = `ACK${Date.now()}`;

    return {
      irn,
      irnDate: new Date().toISOString(),
      ackNo,
      ackDate: new Date().toISOString(),
      qrCode: Buffer.from(JSON.stringify({ irn, ackNo, invoiceNo: invoice.invoiceNo, total: invoice.grandTotal })).toString('base64'),
      message: 'e-Invoice generated (simulated - configure API credentials for real generation)',
    };
  }

  async testConnection(businessId: string): Promise<{ success: boolean; message: string }> {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return { success: false, message: 'Business not found' };

    const settings = (business.settings as any) || {};
    const apiConfig: EinvoiceConfig = {
      ...settings.einvoiceApi,
      gstin: business.gstin,
    };

    if (!apiConfig.username || !apiConfig.password || !apiConfig.clientId || !apiConfig.clientSecret) {
      return { success: false, message: 'API credentials not configured' };
    }

    try {
      await this.getAccessToken(businessId, apiConfig);
      return { success: true, message: 'e-Invoice API connection successful' };
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
