import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ImportService } from './import.service';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';
import { memoryStorage } from 'multer';

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@UsePipes(new ValidationPipe({ whitelist: false, transform: false }))
@Controller('businesses/:businessId/import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('customers')
  @ApiOperation({
    summary: 'Import customers from Khatabook or similar format',
  })
  async importCustomers(
    @Param('businessId') businessId: string,
    @Body() body: any,
  ) {
    const records = Array.isArray(body?.records) ? body.records : [];
    return this.importService.importCustomers(businessId, records);
  }

  @Post('products')
  @ApiOperation({ summary: 'Import products from Khatabook or similar format' })
  async importProducts(
    @Param('businessId') businessId: string,
    @Body() body: any,
  ) {
    const records = Array.isArray(body?.records) ? body.records : [];
    return this.importService.importProducts(businessId, records);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Import invoices from GoGST or simple format' })
  async importInvoices(
    @Param('businessId') businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: any,
  ) {
    const records = Array.isArray(body?.records) ? body.records : [];
    return this.importService.importInvoices(businessId, user.sub, records);
  }

  @Post('parse-csv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'text/csv',
          'application/vnd.ms-excel',
          'application/csv',
          'text/x-csv',
          'text/x-comma-separated-values',
          'text/plain',
        ];
        if (
          allowedMimes.includes(file.mimetype) ||
          file.originalname.endsWith('.csv') ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.xls')
        ) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV and Excel files are allowed'), false);
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
  @ApiOperation({
    summary: 'Parse CSV/Excel file and return preview with detected type',
  })
  async parseCsv(
    @Param('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { error: 'No file uploaded' };
    }
    return this.importService.parseCsv(file.buffer, file.originalname);
  }

  @Post('invoices/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.xls') ||
          file.originalname.endsWith('.csv')
        ) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV and Excel files are allowed'), false);
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
  @ApiOperation({ summary: 'Upload GoGST XLSX file and import invoices directly' })
  async importInvoicesFromFile(
    @Param('businessId') businessId: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { error: 'No file uploaded' };
    }
    const rawRecords = this.importService.getAllRecords(file.buffer, file.originalname);
    const result = await this.importService.importInvoices(businessId, user.sub, rawRecords);
    return result;
  }

  @Delete('invoices')
  @ApiOperation({ summary: 'Clear all imported invoices (removes items, payments, credit notes)' })
  async clearInvoices(@Param('businessId') businessId: string) {
    return this.importService.clearInvoices(businessId);
  }

  @Delete('customers')
  @ApiOperation({ summary: 'Clear all imported customers' })
  async clearCustomers(@Param('businessId') businessId: string) {
    return this.importService.clearCustomers(businessId);
  }

  @Delete('all')
  @ApiOperation({ summary: 'Delete ALL data (customers, invoices, products) for this business' })
  async clearAllData(@Param('businessId') businessId: string) {
    return this.importService.clearAllData(businessId);
  }

  @Post('products/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.xls') ||
          file.originalname.endsWith('.csv')
        ) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV and Excel files are allowed'), false);
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
  @ApiOperation({ summary: 'Upload GoGST XLSX file and import products directly' })
  async importProductsFromFile(
    @Param('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { error: 'No file uploaded' };
    }
    const rawRecords = this.importService.getAllRecords(file.buffer, file.originalname);
    const result = await this.importService.importProducts(businessId, rawRecords);
    return result;
  }
}
