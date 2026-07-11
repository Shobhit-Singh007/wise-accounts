import { IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UpdatePermissionsDto {
  @ApiProperty({ example: ['invoices.view', 'invoices.create', 'customers.view'] })
  @IsArray()
  permissions: string[];

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
