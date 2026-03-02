import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum StepAction {
  START = 'START',
  COMPLETE = 'COMPLETE',
  SKIP = 'SKIP',
}

export class AdvanceStepDto {
  @ApiProperty({ description: 'ID da etapa da cadeia' })
  @IsUUID()
  chainStepId: string;

  @ApiProperty({ enum: StepAction })
  @IsEnum(StepAction)
  action: StepAction;

  @ApiPropertyOptional({ description: 'ID do centro de trabalho utilizado' })
  @IsOptional()
  @IsUUID()
  workCenterId?: string;

  @ApiPropertyOptional({ example: 'Operador Carlos' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  operatorName?: string;

  @ApiPropertyOptional({ example: 95, description: 'Quantidade produzida na etapa' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  quantityProduced?: number;

  @ApiPropertyOptional({ example: 5, description: 'Quantidade rejeitada na etapa' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  quantityRejected?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string;
}
