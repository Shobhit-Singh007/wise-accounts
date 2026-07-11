import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let accessToken: string;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    business: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    userBusiness: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    warehouse: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
    },
    customerTransaction: {
      create: jest.fn(),
    },
    stockBatch: {
      groupBy: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    accessToken = jwtService.sign({
      sub: 'user-1',
      phone: '+919876543210',
      role: 'BUSINESS_ADMIN',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) health check should return Hello World!', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('should complete full flow: register -> login -> create business -> create customer -> create invoice -> list invoices', async () => {
    const mockUser = {
      id: 'user-1',
      phone: '+919876543210',
      email: 'user@example.com',
      name: 'John Doe',
      role: 'BUSINESS_ADMIN',
      isActive: true,
      passwordHash: 'hashed',
      avatarUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockBusiness = {
      id: 'biz-1',
      name: 'My Shop',
      gstin: '29ABCDE1234F1Z5',
      state: 'Maharashtra',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockCustomer = {
      id: 'cust-1',
      businessId: 'biz-1',
      name: 'Rahul Sharma',
      phone: '+919876543210',
      balance: 0,
      isActive: true,
      group: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockInvoice = {
      id: 'inv-1',
      businessId: 'biz-1',
      customerId: 'cust-1',
      invoiceNo: 'INV-1712345678-123',
      type: 'B2C',
      subtotal: 450,
      taxAmount: 22.5,
      discount: 0,
      grandTotal: 472.5,
      paidAmount: 0,
      status: 'CONFIRMED',
      createdById: 'user-1',
      items: [
        {
          id: 'item-1',
          productId: null,
          itemName: 'Wheat Flour',
          quantity: 10,
          unit: 'kg',
          rate: 45,
          taxableValue: 450,
          taxRate: 5,
          cgst: 11.25,
          sgst: 11.25,
          igst: 0,
          total: 472.5,
        },
      ],
      customer: mockCustomer,
      payments: [],
      createdAt: new Date('2024-06-15'),
      updatedAt: new Date('2024-06-15'),
    };

    const mockTx = {
      invoice: {
        create: jest.fn().mockResolvedValue(mockInvoice),
        findUnique: jest.fn().mockResolvedValue(mockInvoice),
      },
      customer: {
        findUnique: jest.fn().mockResolvedValue({ ...mockCustomer, balance: 472.5 }),
        update: jest.fn().mockResolvedValue({ ...mockCustomer, balance: 472.5 }),
      },
      customerTransaction: {
        create: jest.fn().mockResolvedValue({}),
      },
      stockBatch: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(mockUser);
    mockPrisma.refreshToken.create.mockResolvedValue({
      id: 'rt-1',
      token: 'mock-refresh',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockPrisma.business.create.mockResolvedValue(mockBusiness);
    mockPrisma.userBusiness.create.mockResolvedValue({});
    mockPrisma.warehouse.create.mockResolvedValue({
      id: 'wh-1',
      businessId: 'biz-1',
      name: 'Main Warehouse',
    });
    mockPrisma.customer.create.mockResolvedValue(mockCustomer);
    mockPrisma.customer.findMany.mockResolvedValue([mockCustomer]);
    mockPrisma.customer.count.mockResolvedValue(1);
    mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
    mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
    mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockTx));
    mockPrisma.invoice.findMany.mockResolvedValue([mockInvoice]);
    mockPrisma.invoice.count.mockResolvedValue(1);

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: '+919876543210',
        email: 'user@example.com',
        name: 'John Doe',
        password: 'Password@123',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toBeDefined();
    const loginAccessToken = registerRes.body.accessToken;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone: '+919876543210',
        password: 'Password@123',
      });

    expect(loginRes.status).toBe(201);
    expect(loginRes.body.accessToken).toBeDefined();

    mockPrisma.userBusiness.findMany.mockResolvedValue([
      { business: mockBusiness },
    ]);

    const createBusinessRes = await request(app.getHttpServer())
      .post('/business')
      .set('Authorization', `Bearer ${loginAccessToken}`)
      .send({
        name: 'My Shop',
        gstin: '29ABCDE1234F1Z5',
        state: 'Maharashtra',
      });

    expect(createBusinessRes.status).toBe(201);

    const createCustomerRes = await request(app.getHttpServer())
      .post('/business/biz-1/customers')
      .set('Authorization', `Bearer ${loginAccessToken}`)
      .send({
        name: 'Rahul Sharma',
        phone: '+919876543210',
      });

    expect(createCustomerRes.status).toBe(201);

    const createInvoiceRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${loginAccessToken}`)
      .send({
        businessId: 'biz-1',
        type: 'B2C',
        customerId: 'cust-1',
        items: [
          {
            itemName: 'Wheat Flour',
            quantity: 10,
            unit: 'kg',
            rate: 45,
            taxRate: 5,
          },
        ],
      });

    expect(createInvoiceRes.status).toBe(201);

    const listInvoicesRes = await request(app.getHttpServer())
      .get('/invoices?businessId=biz-1')
      .set('Authorization', `Bearer ${loginAccessToken}`);

    expect(listInvoicesRes.status).toBe(200);
  });
});
