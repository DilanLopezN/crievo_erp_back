import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { FinancialCategoryType, DreGroup } from './create-category.dto';

export class FilterCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: FinancialCategoryType })
  @IsOptional()
  @IsEnum(FinancialCategoryType)
  type?: FinancialCategoryType;

  @ApiPropertyOptional({ enum: DreGroup })
  @IsOptional()
  @IsEnum(DreGroup)
  dreGroup?: DreGroup;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Retornar apenas categorias raiz (sem parent)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  rootOnly?: boolean;
}
