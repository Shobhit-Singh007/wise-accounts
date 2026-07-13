import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const phone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone, password: 'test1234', name: 'Test User' })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.phone).toBe(phone);
    });

    it('should reject duplicate phone', async () => {
      const phone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone, password: 'test1234', name: 'Test User' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone, password: 'test1234', name: 'Test User 2' })
        .expect(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const phone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ phone, password: 'test1234', name: 'Test User' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone, password: 'test1234' })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ phone: '0000000000', password: 'wrong' })
        .expect(401);
    });
  });
});
