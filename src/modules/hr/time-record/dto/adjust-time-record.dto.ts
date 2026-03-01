import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, Matches } from 'class-validator';

export enum TimeRecordStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ADJUSTED = 'ADJUSTED',
}

export class AdjustTimeRecordDto {
  @ApiPropertyOptional({ example: '08:05', description: 'Horário de entrada ajustado (HH:MM)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de hora inválido. Use HH:MM' })
  entryTime?: string;

  @ApiPropertyOptional({ example: '12:10' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de hora inválido. Use HH:MM' })
  lunchStartTime?: string;

  @ApiPropertyOptional({ example: '13:05' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de hora inválido. Use HH:MM' })
  lunchEndTime?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de hora inválido. Use HH:MM' })
  exitTime?: string;

  @ApiPropertyOptional({ enum: TimeRecordStatus })
  @IsOptional()
  @IsEnum(TimeRecordStatus)
  status?: TimeRecordStatus;

  @ApiPropertyOptional({ description: 'Justificativa do ajuste' })
  @IsOptional()
  @IsString()
  notes?: string;
}
