import { Test, TestingModule } from '@nestjs/testing';
import { DynamoDBService } from './dynamo-db.service';
import { ConfigService } from '@nestjs/config';

describe('DynamoDBService', () => {
  let service: DynamoDBService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamoDBService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<DynamoDBService>(DynamoDBService);
  });

  describe('initialization', () => {
    it('should not be available when AWS credentials missing', () => {
      configService.get.mockReturnValue(undefined);
      const svc = new DynamoDBService(configService);
      expect(svc.isAvailable).toBe(false);
    });

    it('should be available when AWS credentials present', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'AWS_ACCESS_KEY_ID') return 'access_key';
        if (key === 'AWS_SECRET_ACCESS_KEY') return 'secret_key';
        return 'us-east-1';
      });
      const svc = new DynamoDBService(configService);
      expect(svc.isAvailable).toBe(true);
    });
  });

  describe('session management', () => {
    it('should return null for getSession when not available', async () => {
      configService.get.mockReturnValue(undefined);
      const svc = new DynamoDBService(configService);
      expect(await svc.getSession('test')).toBeNull();
    });

    it('should silently handle setSession when not available', async () => {
      configService.get.mockReturnValue(undefined);
      const svc = new DynamoDBService(configService);
      await expect(svc.setSession('test', {})).resolves.toBeUndefined();
    });

    it('should silently handle deleteSession when not available', async () => {
      configService.get.mockReturnValue(undefined);
      const svc = new DynamoDBService(configService);
      await expect(svc.deleteSession('test')).resolves.toBeUndefined();
    });
  });

  describe('cache management', () => {
    it('should return null for getCached when not available', async () => {
      configService.get.mockReturnValue(undefined);
      const svc = new DynamoDBService(configService);
      expect(await svc.getCached('key')).toBeNull();
    });

    it('should silently handle setCached when not available', async () => {
      configService.get.mockReturnValue(undefined);
      const svc = new DynamoDBService(configService);
      await expect(svc.setCached('key', 'value')).resolves.toBeUndefined();
    });

    it('should silently handle deleteCached when not available', async () => {
      configService.get.mockReturnValue(undefined);
      const svc = new DynamoDBService(configService);
      await expect(svc.deleteCached('key')).resolves.toBeUndefined();
    });
  });

  describe('notifications', () => {
    it('should silently handle saveNotification when not available', async () => {
      configService.get.mockReturnValue(undefined);
      const svc = new DynamoDBService(configService);
      await expect(svc.saveNotification('biz1', 'notif1', {})).resolves.toBeUndefined();
    });

    it('should return empty array for getNotifications when not available', async () => {
      configService.get.mockReturnValue(undefined);
      const svc = new DynamoDBService(configService);
      expect(await svc.getNotifications('biz1')).toEqual([]);
    });
  });

  describe('isAvailable property', () => {
    it('should return false when docClient is null', () => {
      configService.get.mockReturnValue(undefined);
      const svc = new DynamoDBService(configService);
      expect(svc.isAvailable).toBe(false);
    });
  });
});
