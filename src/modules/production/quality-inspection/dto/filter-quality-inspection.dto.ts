import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { QualityInspectionType } from './create-quality-inspection.dto';
import { QualityInspectionStatus } from './update-quality-inspection.dto';

export class FilterQualityInspectionDto {
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
  @IsUUID()
  productionOrderId?: string;

  @ApiPropertyOptional({ enum: QualityInspectionType })
  @IsOptional()
  @IsEnum(QualityInspectionType)
  type?: QualityInspectionType;

  @ApiPropertyOptional({ enum: QualityInspectionStatus })
  @IsOptional()
  @IsEnum(QualityInspectionStatus)
  status?: QualityInspectionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
