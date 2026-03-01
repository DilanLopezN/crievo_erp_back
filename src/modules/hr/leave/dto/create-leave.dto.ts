import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum LeaveType {
  VACATION = 'VACATION',
  SICK = 'SICK',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  PERSONAL = 'PERSONAL',
  BEREAVEMENT = 'BEREAVEMENT',
  OTHER = 'OTHER',
}

export class CreateLeaveDto {
  @ApiProperty({ description: 'ID do funcionário' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ enum: LeaveType, example: LeaveType.VACATION })
  @IsEnum(LeaveType)
  type: LeaveType;

  @ApiProperty({ example: '2024-07-01', description: 'Data de início' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-07-30', description: 'Data de término' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 'Férias anuais referentes ao período 2023/2024' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
