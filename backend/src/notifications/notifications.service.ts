import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { PrismaService } from '../prisma/prisma.service';
import { DynamoDBService } from '../aws/dynamo-db.service';
import { Twilio } from 'twilio';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private snsClient: SNSClient | null = null;
  private sesClient: SESClient | null = null;
  private twilioClient: Twilio | null = null;
  private twilioFromNumber: string | null = null;

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

    // Initialize Twilio if configured
    const twilioSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const twilioToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioFromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER') ?? null;
    if (twilioSid && twilioToken && this.twilioFromNumber) {
      this.twilioClient = new Twilio(twilioSid, twilioToken);
      this.logger.log('Twilio SMS client initialized');
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

  async sendOtpSms(phone: string, otp: string) {
    const formattedPhone = this.formatPhone(phone);
    const phone10 = formattedPhone.replace('+91', '');
    this.logger.log(`Attempting OTP SMS to ${formattedPhone}`);

    // Try MSG91 OTP API first (dedicated endpoint, no flow ID needed)
    const msg91AuthKey = this.configService.get<string>('MSG91_AUTH_KEY');
    if (msg91AuthKey) {
      try {
        const response = await fetch('https://api.msg91.com/api/v5/otp', {
          method: 'POST',
          headers: {
            'authkey': msg91AuthKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            otp,
            authkey: msg91AuthKey,
            mobile: phone10,
            sender: this.configService.get('SMS_SENDER_ID', 'WISEACCS'),
            otp_expiry: '600',
            otp_length: '6',
          }),
        });
        const result = await response.json() as any;
        if (result.type === 'success') {
          this.logger.log(`MSG91 OTP sent to ${phone10}: ${JSON.stringify(result)}`);
          return;
        }
        this.logger.error(`MSG91 OTP API returned: ${JSON.stringify(result)}`);
      } catch (error) {
        this.logger.error(`MSG91 OTP API failed to ${phone10}: ${(error as Error).message}`);
      }
    }

    // Fallback to regular SMS with OTP in message
    await this.sendSms(phone, `Your Wise Accounts verification code is: ${otp}. Valid for 10 minutes.`);
  }

  async sendOtpEmail(email: string, otp: string) {
    const subject = 'Your Wise Accounts Verification Code';
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .body { padding: 30px; text-align: center; }
    .otp { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333; background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 15px 30px; display: inline-block; margin: 20px 0; }
    .text { color: #666; font-size: 14px; line-height: 1.6; }
    .footer { padding: 20px 30px; background: #f8f9fa; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Wise Accounts</h1>
    </div>
    <div class="body">
      <p class="text">Your verification code is:</p>
      <div class="otp">${otp}</div>
      <p class="text">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
    </div>
    <div class="footer">
      If you did not request this code, please ignore this email.
    </div>
  </div>
</body>
</html>`;

    const textBody = `Your Wise Accounts verification code is: ${otp}. Valid for 10 minutes. Do not share it with anyone.`;

    await this.sendEmail(email, subject, textBody, htmlBody);
    this.logger.log(`OTP email sent to ${email}`);
  }

  async sendStaffInviteSms(phone: string, businessName: string, inviteLink: string) {
    const msg = `You've been invited to join ${businessName} on Wise Accounts! Accept here: ${inviteLink}`;
    await this.sendSms(phone, msg);
    this.logger.log(`Staff invite SMS sent to ${phone}`);
  }

  async sendStaffInviteEmail(email: string, businessName: string, inviterName: string, inviteLink: string) {
    const subject = `Invitation to join ${businessName} on Wise Accounts`;
    const textBody = `${inviterName} has invited you to join ${businessName} as a team member on Wise Accounts.\n\nAccept the invitation here: ${inviteLink}\n\nThis invitation expires in 7 days.`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .body { padding: 30px; text-align: center; }
    .text { color: #666; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; margin: 20px 0; }
    .footer { padding: 20px 30px; background: #f8f9fa; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Wise Accounts</h1>
    </div>
    <div class="body">
      <p class="text"><strong>${inviterName}</strong> has invited you to join <strong>${businessName}</strong> as a team member.</p>
      <a href="${inviteLink}" class="btn">Accept Invitation</a>
      <p class="text">This invitation expires in <strong>7 days</strong>.</p>
    </div>
    <div class="footer">
      If you did not expect this invitation, please ignore this email.
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail(email, subject, textBody, htmlBody);
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

  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('91') && cleaned.length >= 12) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+91${cleaned.slice(1)}`;
    return `+91${cleaned}`;
  }

  async sendSms(phone: string, message: string) {
    const formattedPhone = this.formatPhone(phone);
    this.logger.log(`Attempting SMS to ${formattedPhone} (original: ${phone})`);

    // Try Twilio first (if configured)
    if (this.twilioClient && this.twilioFromNumber) {
      try {
        const result = await this.twilioClient.messages.create({
          body: message,
          from: this.twilioFromNumber,
          to: formattedPhone,
        });
        this.logger.log(`Twilio SMS sent to ${formattedPhone}: ${result.sid}`);
        return;
      } catch (error: any) {
        const errCode = error?.code || error?.status || 'unknown';
        const errMsg = error?.message || String(error);
        this.logger.error(`Twilio SMS failed to ${formattedPhone} [code=${errCode}]: ${errMsg}`);
        if (errCode === 21211 || errMsg.includes('unverified')) {
          this.logger.error(`Twilio TRIAL restriction: Verify ${formattedPhone} at https://console.twilio.com → Phone Numbers → Verified Caller IDs`);
        }
      }
    } else {
      this.logger.warn('Twilio not configured (missing SID, auth token, or from number)');
    }

    // Try MSG91 next
    const msg91AuthKey = this.configService.get<string>('MSG91_AUTH_KEY');
    const msg91FlowId = this.configService.get<string>('MSG91_FLOW_ID');

    if (msg91AuthKey) {
      try {
        const phone10 = formattedPhone.replace('+91', '');

        if (msg91FlowId) {
          const response = await fetch('https://api.msg91.com/api/v5/flow/', {
            method: 'POST',
            headers: {
              'authkey': msg91AuthKey,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              flow_id: msg91FlowId,
              sender: this.configService.get('SMS_SENDER_ID', 'WISEACCS'),
              mobiles: phone10,
              VAR1: message,
            }),
          });
          const result = await response.json();
          this.logger.log(`MSG91 SMS (flow) sent to ${phone10}: ${JSON.stringify(result)}`);
          return;
        } else {
          const response = await fetch('https://api.msg91.com/api/v2/sendsms', {
            method: 'POST',
            headers: {
              'authkey': msg91AuthKey,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              sender: this.configService.get('SMS_SENDER_ID', 'WISEACCS'),
              to: [phone10],
              message: message,
              type: 'text',
            }),
          });
          const result = await response.json();
          this.logger.log(`MSG91 SMS (direct) sent to ${phone10}: ${JSON.stringify(result)}`);
          return;
        }
      } catch (error) {
        this.logger.error(`MSG91 SMS failed to ${formattedPhone}: ${(error as Error).message}`);
      }
    } else {
      this.logger.warn('MSG91 not configured (missing auth key)');
    }

    // Fallback to AWS SNS
    if (this.snsClient) {
      try {
        await this.snsClient.send(new PublishCommand({
          PhoneNumber: formattedPhone,
          Message: message,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: this.configService.get('SMS_PROMOTIONAL_TYPE') || 'Promotional' },
            'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: this.configService.get('SMS_SENDER_ID') || 'WISEACCS' },
          },
        }));
        this.logger.log(`AWS SNS SMS sent to ${formattedPhone}`);
        return;
      } catch (error) {
        this.logger.error(`AWS SNS SMS failed to ${formattedPhone}: ${(error as Error).message}`);
      }
    } else {
      this.logger.warn('AWS SNS not configured');
    }

    this.logger.error(`ALL SMS PROVIDERS FAILED for ${formattedPhone}. Message: ${message}`);
  }

  private async sendEmail(to: string, subject: string, body: string, htmlBody?: string) {
    if (!this.sesClient) {
      this.logger.warn(`Email not sent (SES not configured): ${to} - ${subject}`);
      return;
    }
    try {
      const messageBody: any = { Text: { Data: body } };
      if (htmlBody) {
        messageBody.Html = { Data: htmlBody };
      }
      await this.sesClient.send(new SendEmailCommand({
        Source: this.configService.get<string>('SES_FROM_EMAIL', 'noreply@wiseaccs.com'),
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: messageBody,
        },
      }));
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${(error as Error).message}`);
    }
  }
}
