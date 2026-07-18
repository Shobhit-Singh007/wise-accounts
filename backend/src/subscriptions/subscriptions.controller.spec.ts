import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let service: jest.Mocked<SubscriptionsService>;

  beforeEach(async () => {
    service = {
      createOrder: jest.fn(),
      verifyPayment: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [{ provide: SubscriptionsService, useValue: service }],
    }).compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
  });

  describe('createOrder', () => {
    it('should call service.createOrder with plan', async () => {
      service.createOrder.mockResolvedValue({ order_id: 'ord_1' } as any);
      const result = await controller.createOrder({ plan: 'business' });
      expect(service.createOrder).toHaveBeenCalledWith('business');
      expect(result).toEqual({ order_id: 'ord_1' });
    });

    it('should default to business plan when not provided', async () => {
      service.createOrder.mockResolvedValue({ order_id: 'ord_2' } as any);
      await controller.createOrder({ plan: '' });
      expect(service.createOrder).toHaveBeenCalledWith('business');
    });

    it('should propagate service error', async () => {
      service.createOrder.mockRejectedValue(new Error('Razorpay error'));
      await expect(controller.createOrder({ plan: 'business' })).rejects.toThrow('Razorpay error');
    });
  });

  describe('verifyPayment', () => {
    it('should call service.verifyPayment with body', async () => {
      const body = {
        razorpay_order_id: 'ord_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'sig_1',
        plan: 'business',
      };
      service.verifyPayment.mockResolvedValue({ verified: true } as any);
      const result = await controller.verifyPayment(body);
      expect(service.verifyPayment).toHaveBeenCalledWith(body);
      expect(result).toEqual({ verified: true });
    });

    it('should propagate verification error', async () => {
      service.verifyPayment.mockRejectedValue(new Error('Payment verification failed'));
      await expect(
        controller.verifyPayment({
          razorpay_order_id: 'ord_1',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: 'bad',
          plan: 'business',
        }),
      ).rejects.toThrow('Payment verification failed');
    });
  });
});
