import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsInt,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QualityInspectionType {
  INCOMING = 'INCOMING',
  IN_PROCESS = 'IN_PROCESS',
  FINAL = 'FINAL',
  RANDOM = 'RANDOM',
}

export class CreateQualityInspectionDto {
  @ApiProperty({ description: 'ID da ordem de produção' })
  @IsUUID()
  productionOrderId: string;

  @ApiPropertyOptional({ description: 'ID da execução de etapa (se inspeção de processo)' })
  @IsOptional()
  @IsUUID()
  stepExecutionId?: string;

  @ApiPropertyOptional({ enum: QualityInspectionType, default: QualityInspectionType.IN_PROCESS })
  @IsOptional()
  @IsEnum(QualityInspectionType)
  type?: QualityInspectionType;

  @ApiPropertyOptional({ example: 'João Inspetor' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  inspectorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @ApiPropertyOptional({ example: 10, description: 'Tamanho da amostra' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  sampleSize?: number;

  @ApiPropertyOptional({
    description: 'Critérios de inspeção em JSON',
    example: [
      { name: 'Dimensões', target: '10mm ± 0.1mm', method: 'Paquímetro' },
      { name: 'Acabamento', target: 'Ra 0.8', method: 'Visual' },
    ],
  })
  @IsOptional()
  criteria?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
