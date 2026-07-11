import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Grains' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  parentId?: string;
}
