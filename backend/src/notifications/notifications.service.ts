import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { PrismaService } from '../prisma/prisma.service';
import { DynamoDBService } from '../aws/dynamo-db.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private snsClient: SNSClient | null = null;
  private sesClient: SESClient | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private dynamoDB: DynamoDBService,
  ) {
    const region = this.configService.get<string>('AWS_REGION', 'ap-south-1');
    if (this.configService.get<string>('AWS_ACCESS_KEY_ID')) {
      this.snsClient = new SNSClient({ region });
      this.sesClient = new SESClient({ region });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleOverduePaymentReminders() {
    const now = new Date();
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'CONFIRMED',
        dueDate: { lt: now },
      },
      include: { customer: true, business: true },
    });

    const unpaid = overdueInvoices.filter(inv => (inv.grandTotal - (inv.paidAmount || 0)) > 0);
    this.logger.log(`Found ${unpaid.length} overdue invoices for payment reminders`);

    for (const invoice of unpaid) {
      const balanceDue = invoice.grandTotal - (invoice.paidAmount || 0);
      if (balanceDue <= 0 || !invoice.customerId) continue;

      const daysOverdue = Math.ceil((now.getTime() - invoice.dueDate!.getTime()) / (1000 * 60 * 60 * 24));

      try {
        await this.sendPaymentReminder(
          invoice.businessId,
          invoice.customerId,
          balanceDue,
          invoice.dueDate,
        );

        const owner = await this.prisma.userBusiness.findFirst({
          where: { businessId: invoice.businessId, role: 'BUSINESS_ADMIN' },
        });
        if (owner) {
          await this.createInAppNotification(invoice.businessId, owner.userId, {
            type: 'PAYMENT_OVERDUE',
            title: `Payment overdue by ${daysOverdue} days`,
            message: `Invoice ${invoice.invoiceNo} (Rs. ${invoice.grandTotal.toLocaleString('en-IN')}) is ${daysOverdue} days overdue. Balance: Rs. ${balanceDue.toLocaleString('en-IN')}`,
            data: { invoiceId: invoice.id, customerId: invoice.customerId, daysOverdue, balanceDue },
          });
        }
      } catch (err) {
        this.logger.error(`Failed to send reminder for invoice ${invoice.invoiceNo}: ${(err as Error).message}`);
      }
    }
  }

  async sendPaymentReminder(businessId: string, customerId: string, amount: number, dueDate?: Date | null) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });
    if (!customer || !customer.phone) return;

    const msg = `Payment reminder: Rs. ${amount.toLocaleString('en-IN')} is due${dueDate ? ` by ${dueDate.toLocaleDateString()}` : ''}. Please pay at your earliest convenience.`;

    await this.sendSms(customer.phone, msg);
    if (customer.email) {
      await this.sendEmail(customer.email, 'Payment Reminder', msg);
    }

    this.logger.log(`Payment reminder sent to ${customer.name} (${customer.phone})`);
  }

  async sendLowStockAlert(businessId: string, productName: string, currentStock: number, threshold: number) {
    const owner = await this.prisma.userBusiness.findFirst({
      where: { businessId, role: 'BUSINESS_ADMIN' },
      include: { user: true },
    });
    if (!owner) return;

    const msg = `Low stock alert: ${productName} has only ${currentStock} units left (threshold: ${threshold}). Please restock soon.`;

    await this.sendSms(owner.user.phone, msg);

    await this.createInAppNotification(businessId, owner.userId, {
      type: 'LOW_STOCK',
      title: `Low stock: ${productName}`,
      message: `${productName} has only ${currentStock} units left (threshold: ${threshold})`,
      data: { productName, currentStock, threshold },
    });
  }

  async sendInvoiceShared(businessId: string, customerId: string, invoiceNo: string, pdfUrl: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });
    if (!customer) return;

    const msg = `Invoice ${invoiceNo} is ready. View here: ${pdfUrl}`;

    if (customer.phone) {
      await this.sendSms(customer.phone, msg);
    }
    if (customer.email) {
      await this.sendEmail(customer.email, `Invoice ${invoiceNo}`, msg);
    }
  }

  async sendGstFilingReminder(businessId: string, returnType: string, dueDate: Date) {
    const owner = await this.prisma.userBusiness.findFirst({
      where: { businessId, role: 'BUSINESS_ADMIN' },
      include: { user: true },
    });
    if (!owner) return;

    const msg = `GST ${returnType} return is due on ${dueDate.toLocaleDateString()}. Please file before the deadline.`;

    await this.sendSms(owner.user.phone, msg);
    await this.sendEmail(owner.user.email || `${owner.user.phone}@sms.local`, `GST ${returnType} Reminder`, msg);
  }

  async sendPaymentReceivedNotification(businessId: string, paymentId: string, amount: number, customerName: string) {
    const owner = await this.prisma.userBusiness.findFirst({
      where: { businessId, role: 'BUSINESS_ADMIN' },
    });
    if (!owner) return;

    await this.createInAppNotification(businessId, owner.userId, {
      type: 'PAYMENT_RECEIVED',
      title: `Payment received: Rs. ${amount.toLocaleString('en-IN')}`,
      message: `${customerName} paid Rs. ${amount.toLocaleString('en-IN')}`,
      data: { paymentId, amount, customerName },
    });
  }

  async sendStaffInviteNotification(businessId: string, userId: string, inviterName: string) {
    await this.createInAppNotification(businessId, userId, {
      type: 'STAFF_INVITE',
      title: 'You have been invited',
      message: `${inviterName} has invited you to join as a team member`,
      data: { inviterName },
    });
  }

  async sendStaffInviteSms(phone: string, businessName: string, inviteLink: string) {
    const msg = `You've been invited to join ${businessName} on Wise Accounts! Accept here: ${inviteLink}`;
    await this.sendSms(phone, msg);
    this.logger.log(`Staff invite SMS sent to ${phone}`);
  }

  async sendStaffInviteEmail(email: string, businessName: string, inviterName: string, inviteLink: string) {
    const subject = `Invitation to join ${businessName} on Wise Accounts`;
    const body = `${inviterName} has invited you to join ${businessName} as a team member on Wise Accounts.\n\nAccept the invitation here: ${inviteLink}\n\nThis invitation expires in 7 days.`;
    await this.sendEmail(email, subject, body);
    this.logger.log(`Staff invite email sent to ${email}`);
  }

  async createInAppNotification(businessId: string, userId: string | null, dto: { type: string; title: string; message: string; data?: any }) {
    const notification = await this.prisma.notification.create({
      data: {
        businessId,
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data || undefined,
      },
    });

    // Backup to DynamoDB for redundancy
    if (this.dynamoDB.isAvailable) {
      await this.dynamoDB.saveNotification(businessId, notification.id, {
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data,
        isRead: false,
      });
    }

    return notification;
  }

  async getNotifications(businessId: string, userId: string, options?: { isRead?: boolean; page?: number; limit?: number }) {
    const where: any = { businessId, userId };
    if (options?.isRead !== undefined) where.isRead = options.isRead;

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { businessId, userId, isRead: false } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      unreadCount,
    };
  }

  async markAsRead(businessId: string, userId: string, notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(businessId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { businessId, userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(businessId: string, userId: string, notificationId: string) {
    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
    return { message: 'Notification deleted' };
  }

  private async sendSms(phone: string, message: string) {
    if (!this.snsClient) {
      this.logger.warn(`SMS not sent (SNS not configured): ${phone} - ${message}`);
      return;
    }
    try {
      await this.snsClient.send(new PublishCommand({
        PhoneNumber: phone,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: this.configService.get('SMS_PROMOTIONAL_TYPE') || 'Promotional' },
          'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: this.configService.get('SMS_SENDER_ID') || 'WISEACCS' },
        },
      }));
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phone}: ${(error as Error).message}`);
    }
  }

  private async sendEmail(to: string, subject: string, body: string) {
    if (!this.sesClient) {
      this.logger.warn(`Email not sent (SES not configured): ${to} - ${subject}`);
      return;
    }
    try {
      await this.sesClient.send(new SendEmailCommand({
        Source: this.configService.get<string>('SES_FROM_EMAIL', 'noreply@wiseaccs.com'),
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: body } },
        },
      }));
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${(error as Error).message}`);
    }
  }
}
