import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private snsClient: SNSClient | null = null;
  private sesClient: SESClient | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const region = this.configService.get<string>('AWS_REGION', 'ap-south-1');
    if (this.configService.get<string>('AWS_ACCESS_KEY_ID')) {
      this.snsClient = new SNSClient({ region });
      this.sesClient = new SESClient({ region });
    }
  }

  async sendPaymentReminder(businessId: string, customerId: string, amount: number, dueDate?: Date) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });
    if (!customer || !customer.phone) return;

    const msg = `Payment reminder: ₹${amount} is due${dueDate ? ` by ${dueDate.toLocaleDateString()}` : ''}. Please pay at your earliest convenience.`;

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

    const msg = `⚠️ Low stock alert: ${productName} has only ${currentStock} units left (threshold: ${threshold}). Please restock soon.`;

    await this.sendSms(owner.user.phone, msg);
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

    const msg = `📋 GST ${returnType} return is due on ${dueDate.toLocaleDateString()}. Please file before the deadline.`;

    await this.sendSms(owner.user.phone, msg);
    await this.sendEmail(owner.user.email || `${owner.user.phone}@sms.local`, `GST ${returnType} Reminder`, msg);
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
      }));
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phone}: ${error.message}`);
    }
  }

  private async sendEmail(to: string, subject: string, body: string) {
    if (!this.sesClient) {
      this.logger.warn(`Email not sent (SES not configured): ${to} - ${subject}`);
      return;
    }
    try {
      await this.sesClient.send(new SendEmailCommand({
        Source: this.configService.get<string>('SES_FROM_EMAIL', 'noreply@billing.app'),
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: body } },
        },
      }));
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
    }
  }
}
