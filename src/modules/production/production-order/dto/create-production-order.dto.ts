import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductionPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateProductionOrderDto {
  @ApiProperty({ description: 'ID do produto a ser fabricado' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: 'ID da lista de materiais (BOM)' })
  @IsOptional()
  @IsUUID()
  bomId?: string;

  @ApiPropertyOptional({ description: 'ID da cadeia produtiva' })
  @IsOptional()
  @IsUUID()
  chainId?: string;

  @ApiProperty({ example: 100, description: 'Quantidade a produzir' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ enum: ProductionPriority, default: ProductionPriority.NORMAL })
  @IsOptional()
  @IsEnum(ProductionPriority)
  priority?: ProductionPriority;

  @ApiPropertyOptional({ example: '2025-12-01' })
  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @ApiPropertyOptional({ example: '2025-12-15' })
  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;

  @ApiPropertyOptional({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  requestedBy?: string;

  @ApiPropertyOptional({ example: 'LOTE-2025-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
