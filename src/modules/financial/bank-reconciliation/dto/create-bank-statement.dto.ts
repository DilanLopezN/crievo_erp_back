import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum StatementTransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class StatementLineDto {
  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'TED RECEBIDA - EMPRESA XYZ' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 5000.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: StatementTransactionType })
  @IsEnum(StatementTransactionType)
  type: StatementTransactionType;

  @ApiPropertyOptional({ example: 15000.00, description: 'Saldo após a transação' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  balance?: number;
}

export class ImportBankStatementDto {
  @ApiProperty({ description: 'ID da conta bancária' })
  @IsUUID()
  bankAccountId: string;

  @ApiProperty({ type: [StatementLineDto], description: 'Linhas do extrato bancário' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatementLineDto)
  lines: StatementLineDto[];
}
