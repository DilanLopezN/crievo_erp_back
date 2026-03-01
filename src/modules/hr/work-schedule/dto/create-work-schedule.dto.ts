import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsNumber,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkScheduleDto {
  @ApiProperty({ example: 'Comercial 8h-17h', description: 'Nome da escala' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    description: 'Dias da semana: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb',
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workDays: number[];

  @ApiProperty({ example: '08:00', description: 'Horário de entrada (HH:MM)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de hora inválido. Use HH:MM' })
  entryTime: string;

  @ApiProperty({ example: '17:00', description: 'Horário de saída (HH:MM)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de hora inválido. Use HH:MM' })
  exitTime: string;

  @ApiPropertyOptional({ example: 60, description: 'Duração do almoço em minutos', default: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  lunchDuration?: number;

  @ApiPropertyOptional({ example: 44, description: 'Horas semanais', default: 44 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(60)
  @Type(() => Number)
  weeklyHours?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
