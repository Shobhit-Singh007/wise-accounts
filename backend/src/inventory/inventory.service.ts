import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StockAdjustDto } from './dto/stock-adjust.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { StockTransferDto } from './dto/stock-transfer.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  async createProduct(businessId: string, dto: CreateProductDto) {
    const product = await this.prisma.product.create({ data: { ...dto, businessId } });
    this.logger.log(`Product created: ${product.name} (${product.id})`);
    return { ...product, stock: 0 };
  }

  async findAllProducts(businessId: string, search?: string, page: number = 1, limit: number = 20) {
    const where: any = { businessId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search } },
      ];
    }
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
      this.prisma.product.count({ where }),
    ]);

    const stockAggs = await this.prisma.stockBatch.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: { productId: { in: products.map((p) => p.id) } },
    });
    const stockMap = new Map(stockAggs.map((s) => [s.productId, s._sum.quantity || 0]));

    const data = products.map((product) => ({
      ...product,
      stock: stockMap.get(product.id) || 0,
    }));

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOneProduct(businessId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
      include: { category: true, stockBatches: { include: { warehouse: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    const totalStock = product.stockBatches.reduce((sum, b) => sum + b.quantity, 0);
    return { ...product, stock: totalStock };
  }

  async updateProduct(businessId: string, productId: string, dto: UpdateProductDto) {
    await this.findOneProduct(businessId, productId);
    return this.prisma.product.update({ where: { id: productId }, data: dto });
  }

  async removeProduct(businessId: string, productId: string) {
    await this.findOneProduct(businessId, productId);
    return this.prisma.product.update({ where: { id: productId }, data: { isActive: false } });
  }

  async adjustStock(businessId: string, productId: string, dto: StockAdjustDto) {
    const product = await this.findOneProduct(businessId, productId);
    const warehouseId = dto.warehouseId || (await this.getDefaultWarehouse(businessId)).id;

    const batchWhere: any = { productId, warehouseId };
    if (dto.batchNo) batchWhere.batchNo = dto.batchNo;

    let batch = await this.prisma.stockBatch.findFirst({ where: batchWhere });

    if (['SALE', 'TRANSFER_OUT', 'ADJUSTMENT'].includes(dto.type) && dto.quantity > 0) {
      const currentStock = batch?.quantity || 0;
      if (currentStock < dto.quantity) {
        throw new BadRequestException(`Insufficient stock. Available: ${currentStock}`);
      }
    }

    const quantityChange = ['PURCHASE', 'TRANSFER_IN', 'RETURN'].includes(dto.type)
      ? dto.quantity
      : -dto.quantity;

    if (batch) {
      await this.prisma.stockBatch.update({
        where: { id: batch.id },
        data: { quantity: batch.quantity + quantityChange },
      });
    } else {
      if (quantityChange < 0) {
        throw new BadRequestException('Batch not found for stock deduction');
      }
      batch = await this.prisma.stockBatch.create({
        data: {
          productId,
          warehouseId,
          batchNo: dto.batchNo || `BATCH-${Date.now()}`,
          quantity: quantityChange,
          purchasePrice: product.purchasePrice,
        },
      });
    }

    await this.prisma.stockMovement.create({
      data: {
        productId,
        warehouseId,
        batchNo: dto.batchNo,
        type: dto.type,
        quantity: dto.quantity,
        notes: dto.notes,
      },
    });

    return batch;
  }

  async transferStock(businessId: string, dto: StockTransferDto) {
    await this.adjustStock(businessId, dto.productId, {
      type: 'TRANSFER_OUT',
      quantity: dto.quantity,
      warehouseId: dto.fromWarehouseId,
      batchNo: dto.batchNo,
      notes: dto.notes,
    });

    await this.adjustStock(businessId, dto.productId, {
      type: 'TRANSFER_IN',
      quantity: dto.quantity,
      warehouseId: dto.toWarehouseId,
      batchNo: dto.batchNo,
      notes: dto.notes,
    });
  }

  async getLowStockAlerts(businessId: string) {
    const products = await this.prisma.product.findMany({
      where: { businessId, isActive: true, isService: false, lowStockThreshold: { gt: 0 } },
    });

    if (products.length === 0) return [];

    const stockAggs = await this.prisma.stockBatch.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: { productId: { in: products.map((p) => p.id) } },
    });
    const stockMap = new Map(stockAggs.map((s) => [s.productId, s._sum.quantity || 0]));

    return products
      .filter((product) => {
        const totalStock = stockMap.get(product.id) || 0;
        return totalStock <= product.lowStockThreshold;
      })
      .map((product) => ({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock: stockMap.get(product.id) || 0,
        threshold: product.lowStockThreshold,
      }));
  }

  async getExpiringBatches(businessId: string, days: number = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return this.prisma.stockBatch.findMany({
      where: {
        expiryDate: { lte: expiryDate, gte: new Date() },
        quantity: { gt: 0 },
        product: { businessId, isActive: true },
      },
      include: { product: true, warehouse: true },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async createCategory(businessId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { ...dto, businessId } });
  }

  async updateCategory(businessId: string, categoryId: string, dto: { name?: string; parentId?: string }) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, businessId },
    });
    if (!category) throw new NotFoundException('Category not found');
    return this.prisma.category.update({
      where: { id: categoryId },
      data: dto,
    });
  }

  async removeCategory(businessId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, businessId },
    });
    if (!category) throw new NotFoundException('Category not found');
    await this.prisma.product.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    });
    return this.prisma.category.delete({ where: { id: categoryId } });
  }

  async findAllCategories(businessId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where: { businessId },
        include: { _count: { select: { products: true } } },
        skip,
        take: limit,
      }),
      this.prisma.category.count({ where: { businessId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createSupplier(businessId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: { ...dto, businessId } });
  }

  async updateSupplier(businessId: string, supplierId: string, dto: any) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return this.prisma.supplier.update({
      where: { id: supplierId },
      data: dto,
    });
  }

  async removeSupplier(businessId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return this.prisma.supplier.update({
      where: { id: supplierId },
      data: { isActive: false },
    });
  }

  async findAllSuppliers(businessId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where: { businessId, isActive: true },
        include: { _count: { select: { purchaseOrders: true } } },
        skip,
        take: limit,
      }),
      this.prisma.supplier.count({ where: { businessId, isActive: true } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updatePurchaseOrder(businessId: string, orderId: string, dto: any) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: orderId, businessId },
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (order.status === 'RECEIVED') throw new BadRequestException('Cannot update a received order');
    return this.prisma.purchaseOrder.update({
      where: { id: orderId },
      data: dto,
    });
  }

  async removePurchaseOrder(businessId: string, orderId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: orderId, businessId },
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (order.status === 'RECEIVED') throw new BadRequestException('Cannot cancel a received order');
    return this.prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
  }

  async getStockMovements(businessId: string, productId: string, page: number = 1, limit: number = 20) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { productId },
        include: { warehouse: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where: { productId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createPurchaseOrder(businessId: string, dto: CreatePurchaseOrderDto) {
    const orderNo = `PO-${Date.now()}`;
    let subtotal = 0;

    const items = dto.items.map((item) => {
      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;
      return { ...item, totalPrice };
    });

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        businessId,
        supplierId: dto.supplierId,
        orderNo,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        subtotal,
        grandTotal: subtotal,
        notes: dto.notes,
        items: { create: items },
      },
      include: { items: { include: { product: true } } },
    });

    return purchaseOrder;
  }

  async findAllPurchaseOrders(businessId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { businessId },
        include: { supplier: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where: { businessId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async receivePurchaseOrder(businessId: string, orderId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: orderId, businessId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Purchase order not found');

    const warehouse = await this.getDefaultWarehouse(businessId);

    for (const item of order.items) {
      await this.adjustStock(businessId, item.productId, {
        type: 'PURCHASE',
        quantity: item.quantity,
        warehouseId: warehouse.id,
        batchNo: item.batchNo ?? undefined,
        notes: `Purchase order: ${order.orderNo}`,
      });
    }

    return this.prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'RECEIVED' },
    });
  }

  private async getDefaultWarehouse(businessId: string) {
    let warehouse = await this.prisma.warehouse.findFirst({
      where: { businessId, isActive: true },
    });
    if (!warehouse) {
      warehouse = await this.prisma.warehouse.create({
        data: { businessId, name: 'Main Warehouse' },
      });
    }
    return warehouse;
  }
}
