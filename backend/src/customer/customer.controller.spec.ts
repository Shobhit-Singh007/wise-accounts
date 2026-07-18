import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

const mockCustomerService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getLedger: jest.fn(),
  recordPayment: jest.fn(),
  createLedgerEntry: jest.fn(),
  deleteLedgerEntry: jest.fn(),
  getLedgerHtml: jest.fn(),
  getLedgerPdf: jest.fn(),
  sendLedgerSms: jest.fn(),
};

describe('CustomerController - GSTIN Lookup', () => {
  let controller: CustomerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        { provide: CustomerService, useValue: mockCustomerService },
      ],
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
    jest.clearAllMocks();
  });

  describe('lookupGstin', () => {
    it('returns error for invalid GSTIN format (too short)', async () => {
      const result = await controller.lookupGstin('27AABCU9603R');
      expect(result).toEqual({ error: 'Invalid GSTIN format' });
    });

    it('returns error for invalid GSTIN pattern', async () => {
      const result = await controller.lookupGstin('00AAAAA0000A0Z0');
      expect(result).toEqual({ error: 'Invalid GSTIN format' });
    });

    it('returns state from GST_STATE_MAP for valid GSTIN', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ error: 'API error' }),
      });

      const result = await controller.lookupGstin('27AABCU9603R1ZM');
      expect(result).toHaveProperty('gstin', '27AABCU9603R1ZM');
      expect(result).toHaveProperty('state', 'Maharashtra');
      expect(result).toHaveProperty('stateCode', '27');
    });

    it('handles external API success', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          gstData: {
            tradeNam: 'Test Corp',
            legalNam: 'Test Corp Pvt Ltd',
            addr1: '123 Test Street',
            loc: 'Mumbai',
            dst: 'Mumbai',
            pin: '400001',
            stj: 'MAHARASHTRA',
            sts: 'Active',
            rgdt: '01/01/2020',
            dty: 'Regular',
          },
        }),
      });

      const result = await controller.lookupGstin('27AABCU9603R1ZM');
      expect(result).toHaveProperty('name', 'Test Corp');
      expect(result).toHaveProperty('tradeName', 'Test Corp');
      expect(result).toHaveProperty('legalName', 'Test Corp Pvt Ltd');
      expect(result).toHaveProperty('address', '123 Test Street, Mumbai, Mumbai');
      expect(result).toHaveProperty('city', 'Mumbai');
      expect(result).toHaveProperty('state', 'Maharashtra');
      expect(result).toHaveProperty('pincode', '400001');
      expect(result).toHaveProperty('status', 'Active');
      expect(result).toHaveProperty('registrationDate', '01/01/2020');
      expect(result).toHaveProperty('businessType', 'Regular');
    });

    it('handles external API error (returns partial data)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ error: 'Not found', gstData: null }),
      });

      const result = await controller.lookupGstin('27AABCU9603R1ZM');
      expect(result).toHaveProperty('gstin', '27AABCU9603R1ZM');
      expect(result).toHaveProperty('state', 'Maharashtra');
      expect(result).toHaveProperty('name', '');
    });

    it('handles fetch exception (network error)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await controller.lookupGstin('27AABCU9603R1ZM');
      expect(result).toHaveProperty('gstin', '27AABCU9603R1ZM');
      expect(result).toHaveProperty('state', 'Maharashtra');
      expect(result).toHaveProperty('name', '');
    });

    it('normalizes GSTIN to uppercase', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ gstData: { tradeNam: 'Test' } }),
      });

      const result = await controller.lookupGstin('27aabcu9603r1zm');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('27AABCU9603R1ZM'),
      );
      expect(result).toHaveProperty('gstin', '27AABCU9603R1ZM');
    });
  });
});
