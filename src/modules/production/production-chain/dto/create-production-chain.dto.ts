import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChainStepDto {
  @ApiProperty({ example: 'Corte' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 1, description: 'Ordem de execução da etapa' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  stepOrder: number;

  @ApiPropertyOptional({ example: 30, description: 'Duração estimada em minutos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ example: 'CNC' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  machineTypeRequired?: string;

  @ApiPropertyOptional({ description: 'ID do centro de trabalho padrão' })
  @IsOptional()
  @IsUUID()
  workCenterId?: string;

  @ApiPropertyOptional({ description: 'Instruções da etapa em JSON' })
  @IsOptional()
  instructions?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false, description: 'Etapa é checkpoint de qualidade' })
  @IsOptional()
  @IsBoolean()
  isQualityCheckpoint?: boolean;
}

export class CreateProductionChainDto {
  @ApiProperty({ example: 'Cadeia Produtiva - Produto A' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'CHAIN-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 120, description: 'Duração total estimada em minutos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  estimatedDurationMinutes?: number;

  @ApiProperty({ type: [ChainStepDto], description: 'Etapas da cadeia produtiva' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChainStepDto)
  steps: ChainStepDto[];
}
