import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class DreFilterDto {
  @ApiProperty({ example: '2025-01-01', description: 'Data inicial do período' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-12-31', description: 'Data final do período' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'ID do centro de custo para filtro' })
  @IsOptional()
  @IsString()
  costCenterId?: string;

  @ApiPropertyOptional({ description: 'Período de comparação - Data inicial' })
  @IsOptional()
  @IsDateString()
  compareStartDate?: string;

  @ApiPropertyOptional({ description: 'Período de comparação - Data final' })
  @IsOptional()
  @IsDateString()
  compareEndDate?: string;
}
