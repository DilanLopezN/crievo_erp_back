import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum WorkCenterType {
  MACHINE = 'MACHINE',
  WORKSTATION = 'WORKSTATION',
  ASSEMBLY_LINE = 'ASSEMBLY_LINE',
  MANUAL = 'MANUAL',
  EXTERNAL = 'EXTERNAL',
}

export enum WorkCenterStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export class CreateWorkCenterDto {
  @ApiProperty({ example: 'CNC Torno 01' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'WC-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: WorkCenterType, default: WorkCenterType.MACHINE })
  @IsOptional()
  @IsEnum(WorkCenterType)
  type?: WorkCenterType;

  @ApiPropertyOptional({ example: 100, description: 'Capacidade produtiva' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({ example: 'UN/H', default: 'UN/H' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  capacityUnit?: string;

  @ApiPropertyOptional({ enum: WorkCenterStatus, default: WorkCenterStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(WorkCenterStatus)
  status?: WorkCenterStatus;

  @ApiPropertyOptional({ example: 150.00, description: 'Custo por hora' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  costPerHour?: number;

  @ApiPropertyOptional({ example: 'Galpão A - Setor 3' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
