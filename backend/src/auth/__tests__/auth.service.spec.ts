import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../aws/dynamo-db.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

import bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: any;
  let jwtMock: any;
  let dynamoMock: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    jwtMock = {
      sign: jest.fn().mockReturnValue('mock-token'),
    };

    dynamoMock = {
      isAvailable: true,
      setSession: jest.fn().mockResolvedValue(undefined),
      getSession: jest.fn().mockResolvedValue(null),
      deleteSession: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('15m') } },
        { provide: DynamoDBService, useValue: dynamoMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should throw ConflictException for existing phone', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: '1', phone: '9999999999' });
      await expect(service.register({ phone: '9999999999', password: 'test123', name: 'Test' }))
        .rejects.toThrow(ConflictException);
    });

    it('should create user and return tokens on success', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: '1',
        phone: '9999999999',
        name: 'Test',
        role: 'USER',
        passwordHash: 'hashed-password',
        isActive: true,
      });
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.register({ phone: '9999999999', password: 'test123', name: 'Test' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.phone).toBe('9999999999');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(bcrypt.hash).toHaveBeenCalledWith('test123', 12);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid phone', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ phone: '0000000000', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '9999999999',
        passwordHash: 'hashed-password',
        isActive: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ phone: '9999999999', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for deactivated account', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '9999999999',
        passwordHash: 'hashed-password',
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login({ phone: '9999999999', password: 'correct' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens and cache session on valid login', async () => {
      const user = {
        id: '1',
        phone: '9999999999',
        name: 'Test',
        role: 'USER',
        passwordHash: 'hashed-password',
        isActive: true,
      };
      prismaMock.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ phone: '9999999999', password: 'correct' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(dynamoMock.setSession).toHaveBeenCalledWith('1', expect.objectContaining({ userId: '1' }), 7 * 24 * 3600);
    });
  });

  describe('getMe', () => {
    it('should return cached user from DynamoDB', async () => {
      dynamoMock.getSession.mockResolvedValue({ userId: '1', phone: '9999999999', role: 'USER', name: 'Test' });
      const result = await service.getMe('1');
      expect(result.id).toBe('1');
      expect(result.phone).toBe('9999999999');
      expect(dynamoMock.getSession).toHaveBeenCalledWith('1');
    });

    it('should fetch from DB and cache when DynamoDB has no session', async () => {
      dynamoMock.getSession.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '9999999999',
        name: 'Test',
        role: 'USER',
        passwordHash: 'hashed-password',
        isActive: true,
      });

      const result = await service.getMe('1');
      expect(result.phone).toBe('9999999999');
      expect(dynamoMock.setSession).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      dynamoMock.getSession.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '9999999999',
        isActive: false,
      });

      await expect(service.getMe('1')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke token and delete DynamoDB session', async () => {
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.refreshToken.findFirst.mockResolvedValue({ userId: '1', token: 'refresh-token' });

      await service.logout('refresh-token');

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'refresh-token', revoked: false },
        data: { revoked: true },
      });
      expect(dynamoMock.deleteSession).toHaveBeenCalledWith('1');
    });
  });

  describe('refreshToken', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refreshToken('invalid')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({ revoked: true, expiresAt: new Date(Date.now() + 100000) });
      await expect(service.refreshToken('revoked')).rejects.toThrow(UnauthorizedException);
    });
  });
});
