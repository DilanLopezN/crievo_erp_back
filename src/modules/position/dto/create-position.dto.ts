import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({ example: 'Gerente de Vendas' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Responsável pela equipe comercial' })
  @IsOptional()
  @IsString()
  description?: string;
}
