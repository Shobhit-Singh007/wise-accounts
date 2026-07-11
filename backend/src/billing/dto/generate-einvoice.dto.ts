import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateEinvoiceDto {
  @ApiProperty({ description: 'Generate IRN via GSTN API (requires API credentials)', default: false })
  @IsBoolean()
  @IsOptional()
  generateViaApi?: boolean;

  @ApiProperty({ description: 'If generateViaApi is false, provide IRN directly' })
  @IsString()
  @IsOptional()
  irn?: string;

  @ApiProperty({ description: 'Acknowledgement Number' })
  @IsString()
  @IsOptional()
  ackNo?: string;

  @ApiProperty({ description: 'Acknowledgement Date' })
  @IsString()
  @IsOptional()
  ackDate?: string;
}
