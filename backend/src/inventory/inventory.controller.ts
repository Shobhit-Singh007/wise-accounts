import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StockAdjustDto } from './dto/stock-adjust.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { StockTransferDto } from './dto/stock-transfer.dto';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@Controller('businesses/:businessId')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  @ApiOperation({ summary: 'List all products with stock' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllProducts(
    @Param('businessId') businessId: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.findAllProducts(businessId, search, page, limit);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a new product' })
  async createProduct(@Param('businessId') businessId: string, @Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(businessId, dto);
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'Get product details with stock batches' })
  async findOneProduct(@Param('businessId') businessId: string, @Param('productId') productId: string) {
    return this.inventoryService.findOneProduct(businessId, productId);
  }

  @Put('products/:productId')
  @ApiOperation({ summary: 'Update product' })
  async updateProduct(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.inventoryService.updateProduct(businessId, productId, dto);
  }

  @Delete('products/:productId')
  @ApiOperation({ summary: 'Deactivate product' })
  async removeProduct(@Param('businessId') businessId: string, @Param('productId') productId: string) {
    return this.inventoryService.removeProduct(businessId, productId);
  }

  @Post('products/:productId/stock-adjust')
  @ApiOperation({ summary: 'Adjust stock (purchase, sale, adjustment, return)' })
  async adjustStock(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() dto: StockAdjustDto,
  ) {
    return this.inventoryService.adjustStock(businessId, productId, dto);
  }

  @Post('stock-transfer')
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  async transferStock(@Param('businessId') businessId: string, @Body() dto: StockTransferDto) {
    return this.inventoryService.transferStock(businessId, dto);
  }

  @Get('low-stock-alerts')
  @ApiOperation({ summary: 'Get low stock alerts' })
  async getLowStockAlerts(@Param('businessId') businessId: string) {
    return this.inventoryService.getLowStockAlerts(businessId);
  }

  @Get('expiring-batches')
  @ApiOperation({ summary: 'Get expiring stock batches' })
  @ApiQuery({ name: 'days', required: false })
  async getExpiringBatches(@Param('businessId') businessId: string, @Query('days') days?: string) {
    return this.inventoryService.getExpiringBatches(businessId, days ? parseInt(days) : 30);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a category' })
  async createCategory(@Param('businessId') businessId: string, @Body() dto: CreateCategoryDto) {
    return this.inventoryService.createCategory(businessId, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List categories' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllCategories(
    @Param('businessId') businessId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.findAllCategories(businessId, page, limit);
  }

  @Put('categories/:categoryId')
  @ApiOperation({ summary: 'Update a category' })
  async updateCategory(
    @Param('businessId') businessId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: { name?: string; parentId?: string },
  ) {
    return this.inventoryService.updateCategory(businessId, categoryId, dto);
  }

  @Delete('categories/:categoryId')
  @ApiOperation({ summary: 'Delete a category' })
  async removeCategory(
    @Param('businessId') businessId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.inventoryService.removeCategory(businessId, categoryId);
  }

  @Post('suppliers')
  @ApiOperation({ summary: 'Create a supplier' })
  async createSupplier(@Param('businessId') businessId: string, @Body() dto: CreateSupplierDto) {
    return this.inventoryService.createSupplier(businessId, dto);
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'List suppliers' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllSuppliers(
    @Param('businessId') businessId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.findAllSuppliers(businessId, page, limit);
  }

  @Put('suppliers/:supplierId')
  @ApiOperation({ summary: 'Update a supplier' })
  async updateSupplier(
    @Param('businessId') businessId: string,
    @Param('supplierId') supplierId: string,
    @Body() dto: any,
  ) {
    return this.inventoryService.updateSupplier(businessId, supplierId, dto);
  }

  @Delete('suppliers/:supplierId')
  @ApiOperation({ summary: 'Delete a supplier' })
  async removeSupplier(
    @Param('businessId') businessId: string,
    @Param('supplierId') supplierId: string,
  ) {
    return this.inventoryService.removeSupplier(businessId, supplierId);
  }

  @Post('purchase-orders')
  @ApiOperation({ summary: 'Create a purchase order' })
  async createPurchaseOrder(@Param('businessId') businessId: string, @Body() dto: CreatePurchaseOrderDto) {
    return this.inventoryService.createPurchaseOrder(businessId, dto);
  }

  @Get('purchase-orders')
  @ApiOperation({ summary: 'List purchase orders' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllPurchaseOrders(
    @Param('businessId') businessId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.findAllPurchaseOrders(businessId, page, limit);
  }

  @Put('purchase-orders/:orderId')
  @ApiOperation({ summary: 'Update a purchase order' })
  async updatePurchaseOrder(
    @Param('businessId') businessId: string,
    @Param('orderId') orderId: string,
    @Body() dto: any,
  ) {
    return this.inventoryService.updatePurchaseOrder(businessId, orderId, dto);
  }

  @Delete('purchase-orders/:orderId')
  @ApiOperation({ summary: 'Cancel a purchase order' })
  async removePurchaseOrder(
    @Param('businessId') businessId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.inventoryService.removePurchaseOrder(businessId, orderId);
  }

  @Post('purchase-orders/:orderId/receive')
  @ApiOperation({ summary: 'Mark purchase order as received and add stock' })
  async receivePurchaseOrder(@Param('businessId') businessId: string, @Param('orderId') orderId: string) {
    return this.inventoryService.receivePurchaseOrder(businessId, orderId);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'List warehouses' })
  async findAllWarehouses(@Param('businessId') businessId: string) {
    return this.inventoryService.findAllWarehouses(businessId);
  }

  @Post('warehouses')
  @ApiOperation({ summary: 'Create a warehouse' })
  async createWarehouse(@Param('businessId') businessId: string, @Body() dto: { name: string; address?: string; city?: string; state?: string }) {
    return this.inventoryService.createWarehouse(businessId, dto);
  }

  @Put('warehouses/:warehouseId')
  @ApiOperation({ summary: 'Update a warehouse' })
  async updateWarehouse(
    @Param('businessId') businessId: string,
    @Param('warehouseId') warehouseId: string,
    @Body() dto: { name?: string; address?: string; city?: string; state?: string },
  ) {
    return this.inventoryService.updateWarehouse(businessId, warehouseId, dto);
  }

  @Delete('warehouses/:warehouseId')
  @ApiOperation({ summary: 'Deactivate a warehouse' })
  async removeWarehouse(@Param('businessId') businessId: string, @Param('warehouseId') warehouseId: string) {
    return this.inventoryService.removeWarehouse(businessId, warehouseId);
  }

  @Get('products/:productId/stock-movements')
  @ApiOperation({ summary: 'Get stock movement history for a product' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getStockMovements(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getStockMovements(businessId, productId, page, limit);
  }
}
