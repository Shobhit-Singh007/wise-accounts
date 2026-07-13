import { Test, TestingModule } from '@nestjs/testing';
import { BarcodeService } from '../services/barcode.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toString: jest.fn().mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock'),
  },
}));

describe('BarcodeService', () => {
  let service: BarcodeService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      invoice: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarcodeService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<BarcodeService>(BarcodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateProductBarcode', () => {
    it('should return barcode SVG for a valid product', async () => {
      prismaMock.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Test Product',
        sku: 'SKU001',
        barcode: 'BAR123',
      });

      const result = await service.generateProductBarcode('biz1', 'p1');
      expect(result).toHaveProperty('barcode', 'BAR123');
      expect(result).toHaveProperty('svg');
      expect(result.svg).toContain('<svg');
    });

    it('should use SKU when barcode is null', async () => {
      prismaMock.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Test Product',
        sku: 'SKU001',
        barcode: null,
      });

      const result = await service.generateProductBarcode('biz1', 'p1');
      expect(result.barcode).toBe('SKU001');
    });

    it('should use product ID as fallback', async () => {
      prismaMock.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Test Product',
        sku: null,
        barcode: null,
      });

      const result = await service.generateProductBarcode('biz1', 'p1');
      expect(result.barcode).toBe('p1');
    });

    it('should throw NotFoundException for missing product', async () => {
      prismaMock.product.findFirst.mockResolvedValue(null);
      await expect(service.generateProductBarcode('biz1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateProductQrCode', () => {
    it('should return QR data, SVG, and data URL', async () => {
      prismaMock.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Test Product',
        sku: 'SKU001',
        sellingPrice: 299,
        taxRate: 18,
      });

      const result = await service.generateProductQrCode('biz1', 'p1');
      expect(result).toHaveProperty('qrData');
      expect(result).toHaveProperty('svg');
      expect(result).toHaveProperty('dataUrl');
      expect(result.svg).toContain('<svg');
      expect(result.dataUrl).toContain('data:image/png');
      const qrPayload = JSON.parse(result.qrData);
      expect(qrPayload.id).toBe('p1');
      expect(qrPayload.name).toBe('Test Product');
    });

    it('should throw NotFoundException for missing product', async () => {
      prismaMock.product.findFirst.mockResolvedValue(null);
      await expect(service.generateProductQrCode('biz1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProductBarcode', () => {
    it('should update and return barcode', async () => {
      prismaMock.product.findFirst.mockResolvedValue({ id: 'p1' });
      prismaMock.product.update.mockResolvedValue({});

      const result = await service.updateProductBarcode('biz1', 'p1', 'NEWBAR');
      expect(result.barcode).toBe('NEWBAR');
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { barcode: 'NEWBAR' },
      });
    });

    it('should throw NotFoundException for missing product', async () => {
      prismaMock.product.findFirst.mockResolvedValue(null);
      await expect(service.updateProductBarcode('biz1', 'nonexistent', 'BAR')).rejects.toThrow(NotFoundException);
    });
  });

  describe('batchGenerateBarcodes', () => {
    it('should generate barcodes for products without one', async () => {
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Product 1' },
        { id: 'p2', name: 'Product 2' },
      ]);
      prismaMock.product.update.mockResolvedValue({});

      const result = await service.batchGenerateBarcodes('biz1');
      expect(result.generated).toBe(2);
      expect(result.products).toHaveLength(2);
      expect(result.products[0]).toHaveProperty('barcode');
    });

    it('should return 0 when no products need barcodes', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.batchGenerateBarcodes('biz1');
      expect(result.generated).toBe(0);
      expect(result.products).toHaveLength(0);
    });
  });
});
