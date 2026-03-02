import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductionPriority } from './create-production-order.dto';
import { ProductionOrderStatus } from './update-production-order.dto';

export class FilterProductionOrderDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProductionOrderStatus })
  @IsOptional()
  @IsEnum(ProductionOrderStatus)
  status?: ProductionOrderStatus;

  @ApiPropertyOptional({ enum: ProductionPriority })
  @IsOptional()
  @IsEnum(ProductionPriority)
  priority?: ProductionPriority;

  @ApiPropertyOptional({ description: 'Filtrar por produto' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plannedStartFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plannedStartTo?: string;
}
