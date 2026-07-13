import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { CreateLedgerEntryDto, LedgerEntryType, PaymentMode } from './dto/create-ledger-entry.dto';
import { SendLedgerSmsDto } from './dto/send-ledger-sms.dto';
import { CreateCustomerGroupDto, UpdateCustomerGroupDto } from './dto/create-customer-group.dto';
import PDFDocument from 'pdfkit';

export interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  invoiceNo?: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  imageUrl?: string;
}

@Injectable()
export class CustomerService {
  private readonly snsClient: SNSClient | null = null;

  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private configService: ConfigService,
  ) {
    const region = this.configService.get<string>('AWS_REGION', 'ap-south-1');
    if (this.configService.get<string>('AWS_ACCESS_KEY_ID')) {
      this.snsClient = new SNSClient({ region });
    }
  }

  async create(businessId: string, dto: CreateCustomerDto) {
    const { openingBalance = 0, ...data } = dto;
    const customer = await this.prisma.customer.create({
      data: { businessId, ...data, balance: openingBalance },
    });

    if (openingBalance !== 0) {
      await this.prisma.customerTransaction.create({
        data: {
          customerId: customer.id,
          type: 'OPENING_BALANCE',
          amount: openingBalance,
          balanceAfter: openingBalance,
          description: 'Opening balance',
        },
      });
    }

    return customer;
  }

  async findAll(businessId: string, search?: string, page: number = 1, limit: number = 20) {
    const where: any = { businessId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { group: true },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(businessId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId },
      include: { group: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(businessId: string, customerId: string, dto: Partial<CreateCustomerDto>) {
    await this.findOne(businessId, customerId);
    return this.prisma.customer.update({ where: { id: customerId }, data: dto });
  }

  async remove(businessId: string, customerId: string) {
    await this.findOne(businessId, customerId);
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { isActive: false },
    });
  }

  async createGroup(businessId: string, dto: CreateCustomerGroupDto) {
    return this.prisma.customerGroup.create({
      data: { businessId, ...dto },
    });
  }

  async findAllGroups(businessId: string) {
    return this.prisma.customerGroup.findMany({
      where: { businessId },
      include: { _count: { select: { customers: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async updateGroup(businessId: string, groupId: string, dto: UpdateCustomerGroupDto) {
    const group = await this.prisma.customerGroup.findFirst({
      where: { id: groupId, businessId },
    });
    if (!group) throw new NotFoundException('Customer group not found');
    return this.prisma.customerGroup.update({
      where: { id: groupId },
      data: dto,
    });
  }

  async removeGroup(businessId: string, groupId: string) {
    const group = await this.prisma.customerGroup.findFirst({
      where: { id: groupId, businessId },
    });
    if (!group) throw new NotFoundException('Customer group not found');

    await this.prisma.customer.updateMany({
      where: { groupId },
      data: { groupId: null },
    });

    return this.prisma.customerGroup.delete({ where: { id: groupId } });
  }

  async getLedger(businessId: string, customerId: string) {
    const customer = await this.findOne(businessId, customerId);

    const [transactions, invoices, payments] = await Promise.all([
      this.prisma.customerTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.invoice.findMany({
        where: { businessId, customerId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          invoiceNo: true,
          invoiceDate: true,
          grandTotal: true,
          paidAmount: true,
          status: true,
          type: true,
          subtotal: true,
          taxAmount: true,
        },
      }),
      this.prisma.payment.findMany({
        where: { businessId, customerId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
          reference: true,
          notes: true,
          paidAt: true,
        },
      }),
    ]);

    const entries: LedgerEntry[] = [];
    let runningBalance = customer.openingBalance || 0;

    if (customer.openingBalance && customer.openingBalance !== 0) {
      entries.push({
        id: 'opening',
        date: customer.createdAt.toISOString(),
        type: 'OPENING_BALANCE',
        description: 'Opening Balance',
        debit: customer.openingBalance > 0 ? customer.openingBalance : 0,
        credit: customer.openingBalance < 0 ? Math.abs(customer.openingBalance) : 0,
        balanceAfter: runningBalance,
      });
    }

    for (const inv of invoices) {
      if (inv.status === 'CANCELLED') continue;
      const entryDate = inv.invoiceDate || inv.id;
      const existing = entries.find((e) => e.id === `inv_${inv.id}`);
      if (!existing) {
        runningBalance += inv.grandTotal;
        entries.push({
          id: `inv_${inv.id}`,
          date: new Date(entryDate).toISOString(),
          type: 'SALE_INVOICE',
          description: `Invoice ${inv.invoiceNo}`,
          invoiceNo: inv.invoiceNo,
          debit: inv.grandTotal,
          credit: 0,
          balanceAfter: runningBalance,
        });
      }
    }

    for (const pay of payments) {
      if (pay.status !== 'COMPLETED') continue;
      runningBalance -= pay.amount;
      entries.push({
        id: `pay_${pay.id}`,
        date: new Date(pay.paidAt).toISOString(),
        type: 'PAYMENT_RECEIVED',
        description: `Payment (${pay.method})${pay.reference ? ' - ' + pay.reference : ''}`,
        debit: 0,
        credit: pay.amount,
        balanceAfter: runningBalance,
      });
    }

    for (const tx of transactions) {
      if (tx.type === 'LEDGER_GAVE') {
        runningBalance += tx.amount;
        entries.push({
          id: `tx_${tx.id}`,
          date: tx.createdAt.toISOString(),
          type: 'LEDGER_GAVE',
          description: tx.description || 'You Gave',
          debit: tx.amount,
          credit: 0,
          balanceAfter: runningBalance,
          imageUrl: tx.imageUrl || undefined,
        });
      } else if (tx.type === 'LEDGER_RECEIVED') {
        runningBalance -= tx.amount;
        entries.push({
          id: `tx_${tx.id}`,
          date: tx.createdAt.toISOString(),
          type: 'LEDGER_RECEIVED',
          description: tx.description || 'You Got',
          debit: 0,
          credit: tx.amount,
          balanceAfter: runningBalance,
          imageUrl: tx.imageUrl || undefined,
        });
      }
    }

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let cumulativeBalance = customer.openingBalance || 0;
    for (const entry of entries) {
      if (entry.type === 'OPENING_BALANCE') {
        cumulativeBalance = entry.balanceAfter;
      } else if (entry.type === 'SALE_INVOICE' || entry.type === 'LEDGER_GAVE') {
        cumulativeBalance += entry.debit;
        entry.balanceAfter = cumulativeBalance;
      } else if (entry.type === 'PAYMENT_RECEIVED' || entry.type === 'LEDGER_RECEIVED') {
        cumulativeBalance -= entry.credit;
        entry.balanceAfter = cumulativeBalance;
      }
    }

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        gstin: customer.gstin,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        creditLimit: customer.creditLimit,
        currentBalance: customer.balance,
      },
      summary: {
        openingBalance: customer.openingBalance || 0,
        totalDebit,
        totalCredit,
        closingBalance: cumulativeBalance,
        totalEntries: entries.length,
      },
      entries,
    };
  }

  async recordPayment(businessId: string, customerId: string, dto: RecordPaymentDto) {
    await this.findOne(businessId, customerId);
    return this.paymentsService.recordPayment(businessId, {
      customerId,
      amount: dto.amount,
      method: dto.method,
      notes: dto.notes,
    });
  }

  async createLedgerEntry(businessId: string, customerId: string, dto: CreateLedgerEntryDto) {
    const customer = await this.findOne(businessId, customerId);

    const txType = dto.type === LedgerEntryType.GAVE ? 'LEDGER_GAVE' : 'LEDGER_RECEIVED';
    const currentBalance = customer.balance || 0;
    const newBalance = dto.type === LedgerEntryType.GAVE
      ? currentBalance + dto.amount
      : currentBalance - dto.amount;

    const description = dto.description || (dto.type === LedgerEntryType.GAVE ? 'You Gave' : 'You Got');

    const transaction = await this.prisma.customerTransaction.create({
      data: {
        customerId,
        type: txType,
        amount: dto.amount,
        balanceAfter: newBalance,
        description: `${description}${dto.paymentMode ? ' (' + dto.paymentMode + ')' : ''}${dto.reference ? ' - ' + dto.reference : ''}`,
        referenceId: dto.reference || null,
        imageUrl: dto.imageUrl || null,
      },
    });

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { balance: newBalance },
    });

    return {
      transaction,
      newBalance,
    };
  }

  async deleteLedgerEntry(businessId: string, customerId: string, transactionId: string) {
    await this.findOne(businessId, customerId);

    const transaction = await this.prisma.customerTransaction.findFirst({
      where: { id: transactionId, customerId },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');

    if (transaction.type === 'OPENING_BALANCE' || transaction.type === 'SALE_INVOICE' || transaction.type === 'PAYMENT_RECEIVED') {
      throw new BadRequestException('Cannot delete invoice or payment transactions');
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    const currentBalance = customer?.balance || 0;
    let newBalance = currentBalance;
    if (transaction.type === 'LEDGER_GAVE') {
      newBalance = currentBalance - transaction.amount;
    } else if (transaction.type === 'LEDGER_RECEIVED') {
      newBalance = currentBalance + transaction.amount;
    }

    await this.prisma.customerTransaction.delete({ where: { id: transactionId } });
    await this.prisma.customer.update({ where: { id: customerId }, data: { balance: newBalance } });

    return { success: true, newBalance };
  }

  async getLedgerHtml(businessId: string, customerId: string): Promise<string> {
    const ledger = await this.getLedger(businessId, customerId);
    const { customer, summary, entries } = ledger;

    const rows = entries.map((e) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e0e0e0;font-size:13px;">${new Date(e.date).toLocaleDateString('en-IN')}</td>
        <td style="padding:8px;border-bottom:1px solid #e0e0e0;font-size:13px;">
          ${e.type.includes('INVOICE') ? '<span style="background:#ffebee;color:#c62828;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:700;">Dr</span>' : ''}
          ${e.type.includes('PAYMENT') ? '<span style="background:#e8f5e9;color:#2e7d32;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:700;">Cr</span>' : ''}
          ${e.type === 'OPENING_BALANCE' ? '<span style="background:#e3f2fd;color:#1565c0;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:700;">OB</span>' : ''}
          ${e.type === 'LEDGER_GAVE' ? '<span style="background:#fff3e0;color:#e65100;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:700;">Dr</span>' : ''}
          ${e.type === 'LEDGER_RECEIVED' ? '<span style="background:#e8f5e9;color:#2e7d32;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:700;">Cr</span>' : ''}
          ${e.description}
          ${e.imageUrl ? '<br/><img src="' + e.imageUrl + '" style="max-width:80px;max-height:60px;margin-top:4px;border-radius:4px;border:1px solid #e0e0e0;cursor:pointer;" onclick="window.open(this.src,\'_blank\')" />' : ''}
        </td>
        <td style="padding:8px;border-bottom:1px solid #e0e0e0;font-size:13px;text-align:right;">${e.invoiceNo || '-'}</td>
        <td style="padding:8px;border-bottom:1px solid #e0e0e0;font-size:13px;text-align:right;color:${e.debit > 0 ? '#c62828' : '#999'};">
          ${e.debit > 0 ? '₹' + e.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
        </td>
        <td style="padding:8px;border-bottom:1px solid #e0e0e0;font-size:13px;text-align:right;color:${e.credit > 0 ? '#2e7d32' : '#999'};">
          ${e.credit > 0 ? '₹' + e.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
        </td>
        <td style="padding:8px;border-bottom:1px solid #e0e0e0;font-size:13px;text-align:right;font-weight:700;color:${e.balanceAfter >= 0 ? '#c62828' : '#2e7d32'};">
          ₹${Math.abs(e.balanceAfter).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ledger - ${customer.name}</title>
  <style>
    @media print { body { margin: 0; } }
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
    .header { background: linear-gradient(135deg, #1a237e, #283593); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { margin: 0 0 5px 0; font-size: 22px; }
    .header p { margin: 2px 0; font-size: 13px; opacity: 0.85; }
    .summary { display: flex; gap: 15px; margin-bottom: 20px; }
    .summary-card { flex: 1; padding: 12px; border-radius: 6px; text-align: center; }
    .summary-card .label { font-size: 11px; color: #666; text-transform: uppercase; }
    .summary-card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0; }
    th { background: #1a237e; color: white; padding: 10px 8px; text-align: left; font-size: 12px; }
    th:nth-child(n+3) { text-align: right; }
    .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #999; }
    .footer-line { border-top: 2px solid #1a237e; width: 100px; margin: 0 auto 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${customer.name}</h1>
    <p>${customer.phone || ''} ${customer.email ? '| ' + customer.email : ''}</p>
    ${customer.gstin ? '<p>GSTIN: ' + customer.gstin + '</p>' : ''}
    ${customer.address ? '<p>' + [customer.address, customer.city, customer.state].filter(Boolean).join(', ') + '</p>' : ''}
  </div>

  <div class="summary">
    <div class="summary-card" style="background:#fff3e0;">
      <div class="label">Opening Balance</div>
      <div class="value" style="color:#e65100;">₹${Math.abs(summary.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="summary-card" style="background:#ffebee;">
      <div class="label">Total Debit</div>
      <div class="value" style="color:#c62828;">₹${summary.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="summary-card" style="background:#e8f5e9;">
      <div class="label">Total Credit</div>
      <div class="value" style="color:#2e7d32;">₹${summary.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="summary-card" style="background:${summary.closingBalance >= 0 ? '#ffebee' : '#e8f5e9'};">
      <div class="label">Closing Balance</div>
      <div class="value" style="color:${summary.closingBalance >= 0 ? '#c62828' : '#2e7d32'};">₹${Math.abs(summary.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Invoice #</th>
        <th>Debit (Dr)</th>
        <th>Credit (Cr)</th>
        <th>Balance</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr style="background:#e8eaf6;font-weight:700;">
        <td colspan="3" style="padding:10px 8px;font-size:13px;">TOTAL</td>
        <td style="padding:10px 8px;text-align:right;color:#c62828;font-size:13px;">₹${summary.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="padding:10px 8px;text-align:right;color:#2e7d32;font-size:13px;">₹${summary.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="padding:10px 8px;text-align:right;font-size:13px;">₹${Math.abs(summary.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <div class="footer-line"></div>
    Generated by Wise Accounts on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
  </div>
</body>
</html>`;
  }

  async getLedgerPdf(businessId: string, customerId: string): Promise<Buffer> {
    const ledger = await this.getLedger(businessId, customerId);
    const { customer, summary, entries } = ledger;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.rect(0, 0, doc.page.width, 90).fill('#1a237e');
      doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('LEDGER', 40, 25);
      doc.fontSize(11).font('Helvetica').text(`${customer.name} | ${customer.phone || ''}`, 40, 50);
      if (customer.gstin) doc.text(`GSTIN: ${customer.gstin}`, 40, 65);
      doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString('en-IN')}`, doc.page.width - 150, 25);

      // Summary cards
      let y = 110;
      const cardW = (doc.page.width - 100) / 4;
      const cards = [
        { label: 'Opening', value: summary.openingBalance, color: '#ff8f00' },
        { label: 'Total Debit', value: summary.totalDebit, color: '#e53935' },
        { label: 'Total Credit', value: summary.totalCredit, color: '#2e7d32' },
        { label: 'Closing', value: summary.closingBalance, color: summary.closingBalance >= 0 ? '#e53935' : '#2e7d32' },
      ];
      cards.forEach((c, i) => {
        const cx = 40 + i * (cardW + 10);
        doc.roundedRect(cx, y, cardW, 45, 4).fill(c.color + '15');
        doc.fillColor('#666').fontSize(8).font('Helvetica').text(c.label, cx, y + 8, { width: cardW, align: 'center' });
        doc.fillColor(c.color).fontSize(13).font('Helvetica-Bold').text(
          `Rs. ${Math.abs(c.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          cx, y + 22, { width: cardW, align: 'center' }
        );
      });

      // Table header
      y = 175;
      const colX = [40, 115, 280, 350, 420, 490];
      const colW = [75, 165, 70, 70, 70, 70];
      const headers = ['Date', 'Description', 'Inv #', 'Debit', 'Credit', 'Balance'];
      doc.rect(40, y, doc.page.width - 80, 20).fill('#1a237e');
      doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(h, colX[i], y + 6, { width: colW[i], align: i < 2 ? 'left' : 'right' }));
      y += 20;

      // Table rows
      doc.font('Helvetica').fontSize(8);
      for (const entry of entries) {
        if (y > 750) {
          doc.addPage();
          y = 40;
          doc.rect(40, y, doc.page.width - 80, 20).fill('#1a237e');
          doc.fillColor('white').font('Helvetica-Bold');
          headers.forEach((h, i) => doc.text(h, colX[i], y + 6, { width: colW[i], align: i < 2 ? 'left' : 'right' }));
          y += 20;
          doc.font('Helvetica').fontSize(8);
        }

        const isGave = entry.type === 'LEDGER_GAVE';
        const isReceived = entry.type === 'LEDGER_RECEIVED';
        const isStandalone = isGave || isReceived;

        doc.fillColor('#333');
        doc.text(new Date(entry.date).toLocaleDateString('en-IN'), colX[0], y, { width: colW[0] });

        const descParts: string[] = [];
        if (entry.type.includes('INVOICE') || isGave) descParts.push('[Dr]');
        if (entry.type.includes('PAYMENT') || isReceived) descParts.push('[Cr]');
        if (entry.type === 'OPENING_BALANCE') descParts.push('[OB]');
        descParts.push(entry.description);
        doc.text(descParts.join(' '), colX[1], y, { width: colW[1], lineBreak: false });

        doc.text(entry.invoiceNo || '-', colX[2], y, { width: colW[2], align: 'right' });

        doc.fillColor(entry.debit > 0 ? '#c62828' : '#999');
        doc.text(entry.debit > 0 ? `Rs. ${entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-', colX[3], y, { width: colW[3], align: 'right' });

        doc.fillColor(entry.credit > 0 ? '#2e7d32' : '#999');
        doc.text(entry.credit > 0 ? `Rs. ${entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-', colX[4], y, { width: colW[4], align: 'right' });

        doc.fillColor(entry.balanceAfter >= 0 ? '#c62828' : '#2e7d32').font('Helvetica-Bold');
        doc.text(`Rs. ${Math.abs(entry.balanceAfter).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colX[5], y, { width: colW[5], align: 'right' });
        doc.font('Helvetica');

        y += 16;
        doc.moveTo(40, y - 2).lineTo(doc.page.width - 40, y - 2).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
      }

      // Footer totals
      y += 5;
      doc.rect(40, y, doc.page.width - 80, 22).fill('#e8eaf6');
      doc.fillColor('#333').font('Helvetica-Bold').fontSize(9);
      doc.text('TOTAL', colX[0], y + 6, { width: colX[2] - colX[0] });
      doc.fillColor('#c62828').text(`Rs. ${summary.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colX[3], y + 6, { width: colW[3], align: 'right' });
      doc.fillColor('#2e7d32').text(`Rs. ${summary.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colX[4], y + 6, { width: colW[4], align: 'right' });
      doc.fillColor(summary.closingBalance >= 0 ? '#c62828' : '#2e7d32')
        .text(`Rs. ${Math.abs(summary.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colX[5], y + 6, { width: colW[5], align: 'right' });

      // Page footer
      const pageFooter = () => {
        doc.fontSize(8).fillColor('#999').font('Helvetica')
          .text(`Generated by Wise Accounts | ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
            40, doc.page.height - 30, { width: doc.page.width - 80, align: 'center' });
      };
      pageFooter();

      doc.end();
    });
  }

  async sendLedgerSms(businessId: string, customerId: string, dto: SendLedgerSmsDto) {
    const customer = await this.findOne(businessId, customerId);
    const phone = dto.phone || customer.phone;
    if (!phone) throw new BadRequestException('Customer has no phone number');

    const ledgerUrl = `https://ledger.wiseaccs.com/l/${businessId}/${customerId}`;
    const message = dto.message || `Hi ${customer.name}, your account balance with Wise Accounts is ₹${Math.abs(customer.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}. View full ledger: ${ledgerUrl}`;

    let sent = false;
    if (this.snsClient) {
      try {
        await this.snsClient.send(new PublishCommand({
          PhoneNumber: phone,
          Message: message,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: this.configService.get('SMS_TRANSACTIONAL_TYPE') || 'Transactional' },
            'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: this.configService.get('SMS_SENDER_ID') || 'WISEACCS' },
          },
        }));
        sent = true;
      } catch (err) {
        throw new BadRequestException(`SMS failed: ${(err as Error).message}`);
      }
    }

    return {
      success: sent,
      phone,
      message,
      ledgerUrl,
      sentAt: new Date().toISOString(),
    };
  }
}
