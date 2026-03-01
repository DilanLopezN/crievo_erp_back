import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsDateString, IsOptional, IsUUID, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from './create-account-receivable.dto';

export class ReceiveAccountDto {
  @ApiProperty({ example: 15000.00, description: 'Valor recebido' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  receivedAmount: number;

  @ApiProperty({ example: '2025-01-30', description: 'Data do recebimento' })
  @IsDateString()
  receivedDate: string;

  @ApiPropertyOptional({ description: 'ID da conta bancária' })
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
