import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DefectSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateDefectDto {
  @ApiProperty({ description: 'ID da ordem de produção' })
  @IsUUID()
  productionOrderId: string;

  @ApiPropertyOptional({ description: 'ID da inspeção (se vinculado)' })
  @IsOptional()
  @IsUUID()
  inspectionId?: string;

  @ApiProperty({ example: 'Trinca na superfície do material' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ enum: DefectSeverity, default: DefectSeverity.MEDIUM })
  @IsOptional()
  @IsEnum(DefectSeverity)
  severity?: DefectSeverity;

  @ApiPropertyOptional({ example: 3, description: 'Quantidade de itens defeituosos' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ example: 'Desgaste da ferramenta de corte' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cause?: string;

  @ApiPropertyOptional({ example: 'Substituir ferramenta e reprocessar peças' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  correctiveAction?: string;
}
