import { Test, TestingModule } from '@nestjs/testing';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

describe('ImportController', () => {
  let controller: ImportController;
  let importService: ImportService;

  const mockImportService = {
    importCustomers: jest.fn(),
    importProducts: jest.fn(),
    importInvoices: jest.fn(),
    parseCsv: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        { provide: ImportService, useValue: mockImportService },
      ],
    }).compile();

    controller = module.get<ImportController>(ImportController);
    importService = module.get<ImportService>(ImportService);
    jest.clearAllMocks();
  });

  describe('importCustomers', () => {
    it('delegates to ImportService.importCustomers', async () => {
      const expected = { imported: 2, skipped: 0, errors: [] };
      mockImportService.importCustomers.mockResolvedValue(expected);

      const result = await controller.importCustomers('biz1', {
        records: [{ name: 'A' }, { name: 'B' }],
      });

      expect(importService.importCustomers).toHaveBeenCalledWith('biz1', [
        { name: 'A' },
        { name: 'B' },
      ]);
      expect(result).toEqual(expected);
    });
  });

  describe('importProducts', () => {
    it('delegates to ImportService.importProducts', async () => {
      const expected = { imported: 1, skipped: 0, errors: [] };
      mockImportService.importProducts.mockResolvedValue(expected);

      const result = await controller.importProducts('biz1', {
        records: [{ name: 'Widget' }],
      });

      expect(importService.importProducts).toHaveBeenCalledWith('biz1', [
        { name: 'Widget' },
      ]);
      expect(result).toEqual(expected);
    });
  });

  describe('importInvoices', () => {
    it('passes businessId and user.sub correctly', async () => {
      const expected = { imported: 1, skipped: 0, errors: [] };
      mockImportService.importInvoices.mockResolvedValue(expected);

      const user = { sub: 'user123' };
      const result = await controller.importInvoices(
        'biz1',
        user as any,
        { records: [{ invoiceNo: 'INV-1' }] },
      );

      expect(importService.importInvoices).toHaveBeenCalledWith(
        'biz1',
        'user123',
        [{ invoiceNo: 'INV-1' }],
      );
      expect(result).toEqual(expected);
    });
  });

  describe('parseCsv', () => {
    it('returns error when no file uploaded', async () => {
      const result = await controller.parseCsv('biz1', undefined as any);
      expect(result).toEqual({ error: 'No file uploaded' });
      expect(mockImportService.parseCsv).not.toHaveBeenCalled();
    });

    it('delegates to ImportService.parseCsv when file is present', async () => {
      const expected = {
        headers: ['name'],
        rows: [['A']],
        totalRows: 1,
        detectedType: 'customers' as const,
      };
      mockImportService.parseCsv.mockReturnValue(expected);

      const file = {
        buffer: Buffer.from('test'),
        originalname: 'data.csv',
      } as Express.Multer.File;

      const result = await controller.parseCsv('biz1', file);

      expect(importService.parseCsv).toHaveBeenCalledWith(file.buffer, 'data.csv');
      expect(result).toEqual(expected);
    });
  });
});
