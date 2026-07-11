import { IsString, IsArray, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CreditNoteItemDto {
  @ApiProperty()
  @IsString()
  invoiceItemId: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'Damaged goods returned', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreateCreditNoteDto {
  @ApiProperty()
  @IsString()
  invoiceId: string;

  @ApiProperty({ type: [CreditNoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditNoteItemDto)
  items: CreditNoteItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
