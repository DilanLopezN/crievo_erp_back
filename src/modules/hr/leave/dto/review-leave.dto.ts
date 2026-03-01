import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveLeaveDto {
  @ApiPropertyOptional({ description: 'Observações da aprovação' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RejectLeaveDto {
  @ApiPropertyOptional({ description: 'Motivo da rejeição' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectedNote?: string;
}
