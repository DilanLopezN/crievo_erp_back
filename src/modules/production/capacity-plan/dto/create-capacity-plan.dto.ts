import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCapacityPlanDto {
  @ApiProperty({ description: 'ID do centro de trabalho' })
  @IsUUID()
  workCenterId: string;

  @ApiProperty({ example: '2025-12-01' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 480, description: 'Minutos disponíveis no dia (default 480 = 8h)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  @Type(() => Number)
  availableMinutes?: number;

  @ApiPropertyOptional({ example: 360, description: 'Minutos planejados' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  @Type(() => Number)
  plannedMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
