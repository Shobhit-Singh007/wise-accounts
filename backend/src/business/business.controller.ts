import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';

@ApiTags('Business')
@ApiBearerAuth()
@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBusinessDto) {
    return this.businessService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all businesses for current user' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.businessService.findAll(user.sub);
  }

  @Get(':businessId')
  @UseGuards(BusinessOwnershipGuard)
  @ApiOperation({ summary: 'Get business by ID' })
  async findOne(@Param('businessId') businessId: string) {
    return this.businessService.findOne(businessId);
  }

  @Put(':businessId')
  @UseGuards(BusinessOwnershipGuard)
  @ApiOperation({ summary: 'Update business' })
  async update(@Param('businessId') businessId: string, @Body() dto: UpdateBusinessDto) {
    return this.businessService.update(businessId, dto);
  }

  @Delete(':businessId')
  @UseGuards(BusinessOwnershipGuard)
  @ApiOperation({ summary: 'Deactivate business' })
  async remove(@Param('businessId') businessId: string) {
    return this.businessService.remove(businessId);
  }

  @Get(':businessId/dashboard')
  @UseGuards(BusinessOwnershipGuard)
  @ApiOperation({ summary: 'Get business dashboard summary' })
  async getDashboard(@Param('businessId') businessId: string) {
    return this.businessService.getDashboard(businessId);
  }

  @Post(':businessId/warehouses')
  @UseGuards(BusinessOwnershipGuard)
  @ApiOperation({ summary: 'Create a warehouse' })
  async createWarehouse(@Param('businessId') businessId: string, @Body() dto: CreateWarehouseDto) {
    return this.businessService.createWarehouse(businessId, dto);
  }

  @Get(':businessId/warehouses')
  @UseGuards(BusinessOwnershipGuard)
  @ApiOperation({ summary: 'List warehouses' })
  async findWarehouses(@Param('businessId') businessId: string) {
    return this.businessService.findWarehouses(businessId);
  }
}
