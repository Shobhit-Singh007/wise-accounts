import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: ConfigService, useValue: configService },
        {
          provide: PrismaService,
          useValue: {} as any,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  describe('createOrder', () => {
    it('should throw error when Razorpay not configured', async () => {
      configService.get.mockReturnValue(undefined);
      await expect(service.createOrder('business')).rejects.toThrow('Razorpay not configured');
    });

    it('should throw error for missing key_id', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'RAZORPAY_KEY_ID') return undefined;
        return 'test_secret';
      });
      await expect(service.createOrder('business')).rejects.toThrow('Razorpay not configured');
    });

    it('should throw error for missing key_secret', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'RAZORPAY_KEY_SECRET') return undefined;
        return 'test_key';
      });
      await expect(service.createOrder('business')).rejects.toThrow('Razorpay not configured');
    });
  });

  describe('verifyPayment', () => {
    const keySecret = 'test_key_secret';

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'RAZORPAY_KEY_SECRET') return keySecret;
        return 'test_key_id';
      });
    });

    it('should throw error on invalid signature', async () => {
      await expect(
        service.verifyPayment({
          razorpay_order_id: 'order_1',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: 'invalid_sig',
          plan: 'business',
        }),
      ).rejects.toThrow('Payment verification failed');
    });

    it('should verify payment with correct signature', async () => {
      const orderId = 'order_test_123';
      const paymentId = 'pay_test_456';
      const expectedSig = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const result = await service.verifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: expectedSig,
        plan: 'premium',
      });

      expect(result).toEqual({
        verified: true,
        plan: 'premium',
        order_id: orderId,
        payment_id: paymentId,
      });
    });

    it('should verify payment with different plan', async () => {
      const orderId = 'order_test_456';
      const paymentId = 'pay_test_789';
      const expectedSig = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const result = await service.verifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: expectedSig,
        plan: 'business',
      });

      expect(result.plan).toBe('business');
      expect(result.verified).toBe(true);
      expect(result.order_id).toBe(orderId);
      expect(result.payment_id).toBe(paymentId);
    });
  });
});
