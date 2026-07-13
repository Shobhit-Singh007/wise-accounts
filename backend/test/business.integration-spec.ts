import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Business Integration', () => {
  let app: INestApplication;
  let authToken: string;
  let businessId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Register and get token
    const phone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const regResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ phone, password: 'test1234', name: 'Business Test User' });
    authToken = regResponse.body.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/businesses', () => {
    it('should create a business', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Business',
          gstin: '27AABCU9603R1ZM',
          address: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '9999999999',
          email: 'test@business.com',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Business');
      businessId = response.body.id;
    });

    it('should get business details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/businesses/${businessId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.name).toBe('Test Business');
    });
  });
});
