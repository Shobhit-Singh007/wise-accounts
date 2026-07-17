import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
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
import {
  ImportCustomersDto,
  ImportProductsDto,
  ImportInvoicesDto,
} from './import.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';
import { memoryStorage } from 'multer';

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@Controller('businesses/:businessId/import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('customers')
  @ApiOperation({
    summary: 'Import customers from Khatabook or similar format',
  })
  async importCustomers(
    @Param('businessId') businessId: string,
    @Body() dto: ImportCustomersDto,
  ) {
    return this.importService.importCustomers(businessId, dto.records);
  }

  @Post('products')
  @ApiOperation({ summary: 'Import products from Khatabook or similar format' })
  async importProducts(
    @Param('businessId') businessId: string,
    @Body() dto: ImportProductsDto,
  ) {
    return this.importService.importProducts(businessId, dto.records);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Import invoices from GoGST or simple format' })
  async importInvoices(
    @Param('businessId') businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ImportInvoicesDto,
  ) {
    return this.importService.importInvoices(businessId, user.sub, dto.records);
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
}
