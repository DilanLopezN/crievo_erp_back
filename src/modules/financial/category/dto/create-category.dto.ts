import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum FinancialCategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum DreGroup {
  GROSS_REVENUE = 'GROSS_REVENUE',
  DEDUCTIONS = 'DEDUCTIONS',
  COST_OF_GOODS = 'COST_OF_GOODS',
  OPERATING_EXPENSES = 'OPERATING_EXPENSES',
  ADMINISTRATIVE_EXPENSES = 'ADMINISTRATIVE_EXPENSES',
  PERSONNEL_EXPENSES = 'PERSONNEL_EXPENSES',
  FINANCIAL_INCOME = 'FINANCIAL_INCOME',
  FINANCIAL_EXPENSES = 'FINANCIAL_EXPENSES',
  OTHER_INCOME = 'OTHER_INCOME',
  OTHER_EXPENSES = 'OTHER_EXPENSES',
  TAXES = 'TAXES',
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Vendas de Produtos' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: '1.01.001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ enum: FinancialCategoryType })
  @IsEnum(FinancialCategoryType)
  type: FinancialCategoryType;

  @ApiPropertyOptional({ enum: DreGroup, description: 'Grupo DRE para classificação na demonstração de resultado' })
  @IsOptional()
  @IsEnum(DreGroup)
  dreGroup?: DreGroup;

  @ApiPropertyOptional({ description: 'ID da categoria pai (para hierarquia)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
