import { Test, TestingModule } from '@nestjs/testing';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';

describe('ExportController', () => {
  let controller: ExportController;
  let exportService: any;

  const mockExportData = {
    headers: ['Name', 'Phone'],
    rows: [['Rahul', '+919876543210']],
  };

  const mockExportService = {
    exportCustomers: jest.fn(),
    exportProducts: jest.fn(),
    exportInvoices: jest.fn(),
    exportSuppliers: jest.fn(),
    exportPayments: jest.fn(),
    toCsv: jest.fn(),
    toJson: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [
        { provide: ExportService, useValue: mockExportService },
      ],
    })
      .overrideGuard(BusinessOwnershipGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ExportController>(ExportController);
    exportService = module.get(ExportService);
  });

  describe('exportCustomers', () => {
    it('should export customers as CSV by default', async () => {
      exportService.exportCustomers.mockResolvedValue(mockExportData);
      exportService.toCsv.mockReturnValue('Name,Phone\nRahul,+919876543210');

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await controller.exportCustomers('biz-1', '', res);

      expect(exportService.exportCustomers).toHaveBeenCalledWith('biz-1');
      expect(exportService.toCsv).toHaveBeenCalledWith(mockExportData);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.send).toHaveBeenCalledWith('Name,Phone\nRahul,+919876543210');
    });

    it('should export customers as JSON when format=json', async () => {
      exportService.exportCustomers.mockResolvedValue(mockExportData);
      exportService.toJson.mockReturnValue('[{"Name":"Rahul","Phone":"+919876543210"}]');

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await controller.exportCustomers('biz-1', 'json', res);

      expect(exportService.toJson).toHaveBeenCalledWith(mockExportData);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
    });
  });

  describe('exportProducts', () => {
    it('should export products as CSV by default', async () => {
      exportService.exportProducts.mockResolvedValue(mockExportData);
      exportService.toCsv.mockReturnValue('Name,Phone\nRahul,+919876543210');

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await controller.exportProducts('biz-1', '', res);

      expect(exportService.exportProducts).toHaveBeenCalledWith('biz-1');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="products.csv"');
    });

    it('should export products as JSON when format=json', async () => {
      exportService.exportProducts.mockResolvedValue(mockExportData);
      exportService.toJson.mockReturnValue('[]');

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await controller.exportProducts('biz-1', 'json', res);

      expect(exportService.toJson).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="products.json"');
    });
  });

  describe('exportInvoices', () => {
    it('should export invoices as CSV by default', async () => {
      exportService.exportInvoices.mockResolvedValue(mockExportData);
      exportService.toCsv.mockReturnValue('Name,Phone\nRahul,+919876543210');

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await controller.exportInvoices('biz-1', '', '', res);

      expect(exportService.exportInvoices).toHaveBeenCalledWith('biz-1', undefined);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="invoices.csv"');
    });

    it('should pass direction filter to service', async () => {
      exportService.exportInvoices.mockResolvedValue(mockExportData);
      exportService.toCsv.mockReturnValue('Name,Phone');

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await controller.exportInvoices('biz-1', '', 'SALE', res);

      expect(exportService.exportInvoices).toHaveBeenCalledWith('biz-1', 'SALE');
    });

    it('should pass undefined direction when direction is empty string', async () => {
      exportService.exportInvoices.mockResolvedValue(mockExportData);
      exportService.toCsv.mockReturnValue('Name,Phone');

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await controller.exportInvoices('biz-1', '', '', res);

      expect(exportService.exportInvoices).toHaveBeenCalledWith('biz-1', undefined);
    });
  });

  describe('exportSuppliers', () => {
    it('should export suppliers as CSV', async () => {
      exportService.exportSuppliers.mockResolvedValue(mockExportData);
      exportService.toCsv.mockReturnValue('Name,Phone\nRahul,+919876543210');

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await controller.exportSuppliers('biz-1', '', res);

      expect(exportService.exportSuppliers).toHaveBeenCalledWith('biz-1');
    });
  });

  describe('exportPayments', () => {
    it('should export payments as CSV', async () => {
      exportService.exportPayments.mockResolvedValue(mockExportData);
      exportService.toCsv.mockReturnValue('Name,Phone\nRahul,+919876543210');

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await controller.exportPayments('biz-1', '', res);

      expect(exportService.exportPayments).toHaveBeenCalledWith('biz-1');
    });
  });

  describe('error handling', () => {
    it('should propagate errors from exportCustomers', async () => {
      exportService.exportCustomers.mockRejectedValue(new Error('DB error'));

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await expect(
        controller.exportCustomers('biz-1', '', res),
      ).rejects.toThrow('DB error');
    });

    it('should propagate errors from exportProducts', async () => {
      exportService.exportProducts.mockRejectedValue(new Error('DB error'));

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await expect(
        controller.exportProducts('biz-1', '', res),
      ).rejects.toThrow('DB error');
    });

    it('should propagate errors from exportInvoices', async () => {
      exportService.exportInvoices.mockRejectedValue(new Error('DB error'));

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      await expect(
        controller.exportInvoices('biz-1', '', '', res),
      ).rejects.toThrow('DB error');
    });
  });
});
