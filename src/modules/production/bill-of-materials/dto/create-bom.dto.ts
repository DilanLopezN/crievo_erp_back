import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BomItemDto {
  @ApiProperty({ description: 'ID do produto/insumo' })
  @IsUUID()
  materialProductId: string;

  @ApiProperty({ example: 2.5 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ example: 'UN', default: 'UN' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ example: 5, description: 'Percentual de perda/desperdício' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  wastePercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateBomDto {
  @ApiProperty({ description: 'ID do produto final' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ example: '1.0', default: '1.0' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @ApiProperty({ example: 'BOM Padrão Produto A' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Quantidade produzida por lote' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Type(() => Number)
  yieldQuantity?: number;

  @ApiProperty({ type: [BomItemDto], description: 'Itens da lista de materiais' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items: BomItemDto[];
}
