import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendLedgerSmsDto {
  @ApiProperty({ example: '9876543210', description: 'Phone number to send SMS to', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'https://ledger.wiseaccs.com/l/abc123', description: 'Custom message override', required: false })
  @IsString()
  @IsOptional()
  message?: string;
}
