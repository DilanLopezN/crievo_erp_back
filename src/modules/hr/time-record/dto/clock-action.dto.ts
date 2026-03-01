import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';

export class LocationDto {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export class ClockActionDto {
  @ApiPropertyOptional({ description: 'Observações sobre o registro' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Localização GPS' })
  @IsOptional()
  @IsObject()
  location?: LocationDto;
}
