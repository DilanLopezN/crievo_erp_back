import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsDateString, IsOptional, IsUUID, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from './create-account-payable.dto';

export class PayAccountDto {
  @ApiProperty({ example: 3500.00, description: 'Valor pago' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  paidAmount: number;

  @ApiProperty({ example: '2025-01-15', description: 'Data do pagamento' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ description: 'ID da conta bancária' })
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
