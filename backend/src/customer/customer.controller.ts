import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Res, Header, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Response } from 'express';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { SendLedgerSmsDto } from './dto/send-ledger-sms.dto';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';

const GST_STATE_MAP: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
  '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh', '97': 'Other Territory',
};

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@Controller('businesses/:businessId/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  async create(@Param('businessId') businessId: string, @Body() dto: CreateCustomerDto) {
    return this.customerService.create(businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all customers' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Param('businessId') businessId: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.customerService.findAll(businessId, search, page, limit);
  }

  @Get(':customerId')
  @ApiOperation({ summary: 'Get customer by ID' })
  async findOne(@Param('businessId') businessId: string, @Param('customerId') customerId: string) {
    return this.customerService.findOne(businessId, customerId);
  }

  @Put(':customerId')
  @ApiOperation({ summary: 'Update customer' })
  async update(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(businessId, customerId, dto);
  }

  @Delete(':customerId')
  @ApiOperation({ summary: 'Delete or deactivate customer' })
  async remove(@Param('businessId') businessId: string, @Param('customerId') customerId: string) {
    return this.customerService.remove(businessId, customerId);
  }

  @Get(':customerId/ledger')
  @ApiOperation({ summary: 'Get customer ledger with transactions and invoices' })
  async getLedger(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.customerService.getLedger(businessId, customerId);
  }

  @Post(':customerId/payments')
  @ApiOperation({ summary: 'Record a payment from customer' })
  async recordPayment(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.customerService.recordPayment(businessId, customerId, dto);
  }

  @Post(':customerId/ledger')
  @ApiOperation({ summary: 'Add a standalone ledger entry (You Gave / You Got)' })
  async createLedgerEntry(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Body() dto: CreateLedgerEntryDto,
  ) {
    return this.customerService.createLedgerEntry(businessId, customerId, dto);
  }

  @Delete(':customerId/ledger/:transactionId')
  @ApiOperation({ summary: 'Delete a standalone ledger entry' })
  async deleteLedgerEntry(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.customerService.deleteLedgerEntry(businessId, customerId, transactionId);
  }

  @Get(':customerId/ledger/print')
  @Header('Content-Type', 'text/html')
  @ApiOperation({ summary: 'Get customer ledger as printable HTML (for PDF)' })
  async getLedgerPrint(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Res() res: Response,
  ) {
    const html = await this.customerService.getLedgerHtml(businessId, customerId);
    res.send(html);
  }

  @Get(':customerId/ledger/pdf')
  @ApiOperation({ summary: 'Download customer ledger as PDF' })
  async getLedgerPdf(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Res() res: Response,
  ) {
    const customer = await this.customerService.findOne(businessId, customerId);
    const pdf = await this.customerService.getLedgerPdf(businessId, customerId);
    const safeName = (customer.name || 'Ledger').replace(/[^a-zA-Z0-9]/g, '_');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Ledger_${safeName}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  }

  @Post(':customerId/ledger/sms')
  @ApiOperation({ summary: 'Send ledger balance via SMS to customer' })
  async sendLedgerSms(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Body() dto: SendLedgerSmsDto,
  ) {
    return this.customerService.sendLedgerSms(businessId, customerId, dto);
  }

  @Post(':customerId/ledger/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'ledger'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|pdf)$/)) {
          cb(new Error('Only image and PDF files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an image for a ledger entry' })
  async uploadLedgerImage(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.customerService.findOne(businessId, customerId);
    return {
      url: `/uploads/ledger/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Get('gstin/:gstin')
  @ApiOperation({ summary: 'Lookup GSTIN details' })
  async lookupGstin(@Param('gstin') gstin: string) {
    const normalized = gstin.toUpperCase().trim();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9]Z[0-9A-Z]$/.test(normalized)) {
      return { error: 'Invalid GSTIN format' };
    }
    const stateCode = normalized.substring(0, 2);
    const pan = normalized.substring(2, 12);
    const stateName = GST_STATE_MAP[stateCode] || '';

    const result: Record<string, string> = {
      gstin: normalized,
      stateCode,
      state: stateName,
      pan,
      name: '',
      tradeName: '',
      legalName: '',
      address: '',
      city: '',
      pincode: '',
      status: '',
      registrationDate: '',
      businessType: '',
    };

    try {
      const resp = await fetch(
        `https://appyflow.in/api/verifyGST?gstNo=${normalized}&key_secret=${process.env.APPYFLOW_KEY || ''}`,
        { signal: AbortSignal.timeout(8000) },
      );
      const data = await resp.json() as any;
      if (!data.error && data.taxpayerInfo) {
        const d = data.taxpayerInfo;
        const addr = d.pradr?.addr || {};
        result.name = d.tradeNam || d.lgnm || '';
        result.tradeName = d.tradeNam || '';
        result.legalName = d.lgnm || '';
        result.address = [addr.bno, addr.st, addr.loc, addr.dst].filter(Boolean).join(', ');
        result.city = addr.loc || addr.city || '';
        result.state = GST_STATE_MAP[stateCode] || addr.stcd || stateName;
        result.pincode = addr.pncd || '';
        result.pan = d.panNo || pan;
        result.status = d.sts || '';
        result.registrationDate = d.rgdt || '';
        result.businessType = d.dty || d.ctb || '';
      }
    } catch { /* AppyFlow unavailable — use GSTIN-decoded fallback */ }

    return result;
  }
}
