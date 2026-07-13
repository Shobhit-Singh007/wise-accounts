import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CreateCustomerGroupDto, UpdateCustomerGroupDto } from './dto/create-customer-group.dto';
import { BusinessOwnershipGuard } from '../common/guards/business-ownership.guard';

@ApiTags('Customer Groups')
@ApiBearerAuth()
@UseGuards(BusinessOwnershipGuard)
@Controller('businesses/:businessId/customer-groups')
export class CustomerGroupsController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer group' })
  async create(@Param('businessId') businessId: string, @Body() dto: CreateCustomerGroupDto) {
    return this.customerService.createGroup(businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all customer groups' })
  async findAll(@Param('businessId') businessId: string) {
    return this.customerService.findAllGroups(businessId);
  }

  @Put(':groupId')
  @ApiOperation({ summary: 'Update a customer group' })
  async update(
    @Param('businessId') businessId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateCustomerGroupDto,
  ) {
    return this.customerService.updateGroup(businessId, groupId, dto);
  }

  @Delete(':groupId')
  @ApiOperation({ summary: 'Delete a customer group' })
  async remove(
    @Param('businessId') businessId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.customerService.removeGroup(businessId, groupId);
  }
}
