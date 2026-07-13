import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoDBService {
  private readonly logger = new Logger(DynamoDBService.name);
  private client: DynamoDBClient | null = null;
  private docClient: DynamoDBDocumentClient | null = null;
  private readonly sessionsTable = 'wise_sessions';
  private readonly cacheTable = 'wise_cache';
  private readonly notificationsTable = 'wise_notifications';

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION', 'ap-south-1');

    if (accessKeyId && secretAccessKey) {
      this.client = new DynamoDBClient({ region, credentials: { accessKeyId, secretAccessKey } });
      this.docClient = DynamoDBDocumentClient.from(this.client, { marshallOptions: { removeUndefinedValues: true } });
      this.logger.log('DynamoDB connected');
    } else {
      this.logger.warn('DynamoDB not configured (missing AWS credentials)');
    }
  }

  get isAvailable(): boolean {
    return this.docClient !== null;
  }

  // ── Session Management ──

  async getSession(sessionId: string): Promise<any | null> {
    if (!this.docClient) return null;
    try {
      const result = await this.docClient.send(new GetCommand({
        TableName: this.sessionsTable,
        Key: { pk: `session:${sessionId}` },
      }));
      return result.Item || null;
    } catch (error) {
      this.logger.error(`getSession error: ${(error as Error).message}`);
      return null;
    }
  }

  async setSession(sessionId: string, data: Record<string, any>, ttlSeconds: number = 3600): Promise<void> {
    if (!this.docClient) return;
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
      await this.docClient.send(new PutCommand({
        TableName: this.sessionsTable,
        Item: {
          pk: `session:${sessionId}`,
          ...data,
          expiresAt,
        },
      }));
    } catch (error) {
      this.logger.error(`setSession error: ${(error as Error).message}`);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.docClient) return;
    try {
      await this.docClient.send(new DeleteCommand({
        TableName: this.sessionsTable,
        Key: { pk: `session:${sessionId}` },
      }));
    } catch (error) {
      this.logger.error(`deleteSession error: ${(error as Error).message}`);
    }
  }

  // ── Generic Cache ──

  async getCached<T = any>(key: string): Promise<T | null> {
    if (!this.docClient) return null;
    try {
      const result = await this.docClient.send(new GetCommand({
        TableName: this.cacheTable,
        Key: { pk: key },
      }));
      if (!result.Item) return null;
      if (result.Item.expiresAt && result.Item.expiresAt < Math.floor(Date.now() / 1000)) {
        await this.deleteCached(key);
        return null;
      }
      return result.Item.data as T;
    } catch (error) {
      this.logger.error(`getCached error: ${(error as Error).message}`);
      return null;
    }
  }

  async setCached(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    if (!this.docClient) return;
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
      await this.docClient.send(new PutCommand({
        TableName: this.cacheTable,
        Item: { pk: key, data, expiresAt },
      }));
    } catch (error) {
      this.logger.error(`setCached error: ${(error as Error).message}`);
    }
  }

  async deleteCached(key: string): Promise<void> {
    if (!this.docClient) return;
    try {
      await this.docClient.send(new DeleteCommand({
        TableName: this.cacheTable,
        Key: { pk: key },
      }));
    } catch (error) {
      this.logger.error(`deleteCached error: ${(error as Error).message}`);
    }
  }

  // ── Notifications (DynamoDB backup) ──

  async saveNotification(businessId: string, notificationId: string, data: Record<string, any>): Promise<void> {
    if (!this.docClient) return;
    try {
      await this.docClient.send(new PutCommand({
        TableName: this.notificationsTable,
        Item: {
          pk: `biz:${businessId}`,
          sk: `notif:${notificationId}`,
          ...data,
          createdAt: new Date().toISOString(),
        },
      }));
    } catch (error) {
      this.logger.error(`saveNotification error: ${(error as Error).message}`);
    }
  }

  async getNotifications(businessId: string, limit: number = 20): Promise<any[]> {
    if (!this.docClient) return [];
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.notificationsTable,
        FilterExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `biz:${businessId}` },
        Limit: limit,
      }));
      return result.Items || [];
    } catch (error) {
      this.logger.error(`getNotifications error: ${(error as Error).message}`);
      return [];
    }
  }
}
