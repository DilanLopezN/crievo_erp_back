import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BOLETO = 'BOLETO',
  CHECK = 'CHECK',
  OTHER = 'OTHER',
}

export class CreateAccountReceivableDto {
  @ApiProperty({ example: 'Venda de serviço - Cliente ABC' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ example: 'Empresa ABC Ltda' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-00' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerDocument?: string;

  @ApiPropertyOptional({ description: 'ID da categoria financeira' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'ID do centro de custo' })
  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @ApiPropertyOptional({ description: 'ID da conta bancária para recebimento' })
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @ApiProperty({ example: 15000.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: '2025-01-30', description: 'Data de vencimento' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'NF-005678' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  installmentNumber?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  installmentTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
