import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QualityInspectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONDITIONAL = 'CONDITIONAL',
}

export class UpdateQualityInspectionDto {
  @ApiPropertyOptional({ enum: QualityInspectionStatus })
  @IsOptional()
  @IsEnum(QualityInspectionStatus)
  status?: QualityInspectionStatus;

  @ApiPropertyOptional({ example: 'Maria Inspetora' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  inspectorName?: string;

  @ApiPropertyOptional({ example: 95 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  approvedQuantity?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  rejectedQuantity?: number;

  @ApiPropertyOptional({ description: 'Resultados da inspeção em JSON' })
  @IsOptional()
  results?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
