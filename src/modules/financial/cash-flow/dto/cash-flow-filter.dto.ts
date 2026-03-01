import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';

export enum CashFlowGroupBy {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
}

export class CashFlowFilterDto {
  @ApiProperty({ example: '2025-01-01', description: 'Data inicial' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-12-31', description: 'Data final' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: CashFlowGroupBy, default: CashFlowGroupBy.MONTH })
  @IsOptional()
  @IsEnum(CashFlowGroupBy)
  groupBy?: CashFlowGroupBy;

  @ApiPropertyOptional({ description: 'Filtrar por conta bancária' })
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional({ description: 'Incluir projeção futura (contas a pagar/receber pendentes)' })
  @IsOptional()
  @IsString()
  includeProjection?: string;
}
