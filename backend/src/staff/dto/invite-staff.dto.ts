import { IsString, IsOptional, IsArray, IsEnum, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class InviteStaffDto {
  @ApiProperty({ example: '9999999999' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'staff@example.com' })
  @IsOptional()
  @IsEmail()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Rahul Kumar' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'manager' })
  @IsOptional()
  @IsString()
  rolePreset?: string;

  @ApiPropertyOptional({ example: ['invoices.view', 'invoices.create', 'customers.view'] })
  @IsOptional()
  @IsArray()
  permissions?: string[];

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.BUSINESS_EDITOR })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
