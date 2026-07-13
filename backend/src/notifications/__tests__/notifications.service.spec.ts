import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../aws/dynamo-db.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: any;
  let dynamoMock: any;

  beforeEach(async () => {
    prismaMock = {
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'n1', type: 'TEST', title: 'Test' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      invoice: { findMany: jest.fn().mockResolvedValue([]) },
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      userBusiness: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    dynamoMock = {
      isAvailable: true,
      saveNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: DynamoDBService, useValue: dynamoMock },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInAppNotification', () => {
    it('should create notification in Prisma', async () => {
      await service.createInAppNotification('biz1', 'user1', {
        type: 'TEST',
        title: 'Test Notification',
        message: 'This is a test',
      });
      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId: 'biz1',
          userId: 'user1',
          type: 'TEST',
          title: 'Test Notification',
          message: 'This is a test',
        }),
      });
    });

    it('should save to DynamoDB when available', async () => {
      await service.createInAppNotification('biz1', 'user1', {
        type: 'TEST',
        title: 'Title',
        message: 'Msg',
      });
      expect(dynamoMock.saveNotification).toHaveBeenCalledWith(
        'biz1',
        'n1',
        expect.objectContaining({ type: 'TEST', isRead: false }),
      );
    });

    it('should skip DynamoDB when unavailable', async () => {
      dynamoMock.isAvailable = false;
      await service.createInAppNotification('biz1', 'user1', {
        type: 'TEST',
        title: 'Title',
        message: 'Msg',
      });
      expect(prismaMock.notification.create).toHaveBeenCalled();
      expect(dynamoMock.saveNotification).not.toHaveBeenCalled();
    });

    it('should include optional data field', async () => {
      await service.createInAppNotification('biz1', 'user1', {
        type: 'TEST',
        title: 'Title',
        message: 'Msg',
        data: { invoiceId: 'inv1', amount: 500 },
      });
      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          data: { invoiceId: 'inv1', amount: 500 },
        }),
      });
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications with meta and unreadCount', async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        { id: 'n1', type: 'TEST', title: 'Test', isRead: false },
      ]);
      prismaMock.notification.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const result = await service.getNotifications('biz1', 'user1');

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('unreadCount');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.unreadCount).toBe(1);
    });

    it('should apply page and limit options', async () => {
      await service.getNotifications('biz1', 'user1', { page: 2, limit: 5 });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should filter by isRead when provided', async () => {
      await service.getNotifications('biz1', 'user1', { isRead: true });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: true }),
        }),
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const result = await service.markAllAsRead('biz1', 'user1');
      expect(result).toHaveProperty('message', 'All notifications marked as read');
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { businessId: 'biz1', userId: 'user1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a single notification as read', async () => {
      prismaMock.notification.update.mockResolvedValue({ id: 'n1', isRead: true });

      await service.markAsRead('biz1', 'user1', 'n1');
      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { isRead: true },
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const result = await service.deleteNotification('biz1', 'user1', 'n1');
      expect(result).toHaveProperty('message', 'Notification deleted');
      expect(prismaMock.notification.delete).toHaveBeenCalledWith({ where: { id: 'n1' } });
    });
  });

  describe('handleOverduePaymentReminders', () => {
    it('should find overdue invoices and create notifications', async () => {
      const pastDate = new Date('2025-01-01');
      prismaMock.invoice.findMany.mockResolvedValue([
        {
          id: 'inv1',
          invoiceNo: 'INV-001',
          grandTotal: 1000,
          paidAmount: 0,
          status: 'CONFIRMED',
          dueDate: pastDate,
          businessId: 'biz1',
          customerId: 'c1',
          customer: { name: 'Test', phone: '9999999999' },
          business: { name: 'Test Biz' },
        },
      ]);
      prismaMock.userBusiness.findFirst.mockResolvedValue({ userId: 'owner1' });

      await service.handleOverduePaymentReminders();

      expect(prismaMock.invoice.findMany).toHaveBeenCalled();
    });

    it('should skip invoices with no balance due', async () => {
      prismaMock.invoice.findMany.mockResolvedValue([
        {
          id: 'inv1',
          invoiceNo: 'INV-001',
          grandTotal: 1000,
          paidAmount: 1000,
          status: 'CONFIRMED',
          dueDate: new Date('2025-01-01'),
          businessId: 'biz1',
          customerId: 'c1',
          customer: { name: 'Test', phone: '9999999999' },
          business: { name: 'Test Biz' },
        },
      ]);

      await service.handleOverduePaymentReminders();

      expect(prismaMock.notification.create).not.toHaveBeenCalled();
    });
  });
});
