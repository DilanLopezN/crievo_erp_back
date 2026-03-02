import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConsumeMaterialDto {
  @ApiProperty({ description: 'ID do material/insumo' })
  @IsUUID()
  materialProductId: string;

  @ApiProperty({ example: 10, description: 'Quantidade consumida' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Type(() => Number)
  actualQuantity: number;

  @ApiPropertyOptional({ example: 'UN', default: 'UN' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ example: 0.5, description: 'Quantidade desperdiçada' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  wasteQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
