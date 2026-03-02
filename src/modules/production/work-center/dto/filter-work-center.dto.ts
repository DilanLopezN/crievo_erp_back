import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkCenterType, WorkCenterStatus } from './create-work-center.dto';

export class FilterWorkCenterDto {
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

  @ApiPropertyOptional({ enum: WorkCenterType })
  @IsOptional()
  @IsEnum(WorkCenterType)
  type?: WorkCenterType;

  @ApiPropertyOptional({ enum: WorkCenterStatus })
  @IsOptional()
  @IsEnum(WorkCenterStatus)
  status?: WorkCenterStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
