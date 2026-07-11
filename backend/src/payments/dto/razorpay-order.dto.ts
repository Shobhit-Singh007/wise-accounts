import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRazorpayOrderDto {
  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  receipt?: string;
}
