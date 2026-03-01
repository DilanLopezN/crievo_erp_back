import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PositionLevel {
  INTERN = 'INTERN',
  JUNIOR = 'JUNIOR',
  PLENO = 'PLENO',
  SENIOR = 'SENIOR',
  SPECIALIST = 'SPECIALIST',
  COORDINATOR = 'COORDINATOR',
  MANAGER = 'MANAGER',
  DIRECTOR = 'DIRECTOR',
  C_LEVEL = 'C_LEVEL',
}

export class CreatePositionDto {
  @ApiProperty({ example: 'Desenvolvedor Backend' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Responsável pelo desenvolvimento de APIs e microsserviços' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'ID do departamento' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ enum: PositionLevel, default: PositionLevel.JUNIOR })
  @IsEnum(PositionLevel)
  level: PositionLevel;

  @ApiPropertyOptional({ example: 3000.0, description: 'Salário mínimo da faixa' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  baseSalaryMin?: number;

  @ApiPropertyOptional({ example: 8000.0, description: 'Salário máximo da faixa' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  baseSalaryMax?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
