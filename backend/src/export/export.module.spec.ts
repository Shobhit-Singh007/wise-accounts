import { Test, TestingModule } from '@nestjs/testing';
import { ExportModule } from './export.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

describe('ExportModule', () => {
  let module: TestingModule;

  const mockPrismaService = {
    customer: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
    invoice: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule, ExportModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide ExportService', () => {
    const service = module.get<ExportService>(ExportService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ExportService);
  });

  it('should have ExportController', () => {
    const controller = module.get<ExportController>(ExportController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ExportController);
  });

  it('should export ExportService for use by other modules', () => {
    const exports = Reflect.getMetadata('exports', ExportModule);
    expect(exports).toContain(ExportService);
  });

  it('should register ExportController', () => {
    const controllers = Reflect.getMetadata('controllers', ExportModule);
    expect(controllers).toContain(ExportController);
  });

  it('should allow ExportService to query customers via Prisma', async () => {
    const service = module.get<ExportService>(ExportService);
    mockPrismaService.customer.findMany.mockResolvedValue([]);
    const result = await service.exportCustomers('biz-1');
    expect(result.rows).toEqual([]);
    expect(mockPrismaService.customer.findMany).toHaveBeenCalled();
  });

  it('should allow ExportService to query products via Prisma', async () => {
    const service = module.get<ExportService>(ExportService);
    mockPrismaService.product.findMany.mockResolvedValue([]);
    const result = await service.exportProducts('biz-1');
    expect(result.rows).toEqual([]);
    expect(mockPrismaService.product.findMany).toHaveBeenCalled();
  });

  it('should allow ExportService to query invoices via Prisma', async () => {
    const service = module.get<ExportService>(ExportService);
    mockPrismaService.invoice.findMany.mockResolvedValue([]);
    const result = await service.exportInvoices('biz-1');
    expect(result.rows).toEqual([]);
    expect(mockPrismaService.invoice.findMany).toHaveBeenCalled();
  });
});
