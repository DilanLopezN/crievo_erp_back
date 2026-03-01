import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsEmail,
  IsDateString,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ContractType {
  CLT = 'CLT',
  PJ = 'PJ',
  INTERN = 'INTERN',
  TEMPORARY = 'TEMPORARY',
  FREELANCER = 'FREELANCER',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export class AddressDto {
  @IsString() street: string;
  @IsString() number: string;
  @IsOptional() @IsString() complement?: string;
  @IsString() neighborhood: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsString() zipCode: string;
}

export class EmergencyContactDto {
  @IsString() name: string;
  @IsString() phone: string;
  @IsString() relationship: string;
}

export class BankInfoDto {
  @IsString() bank: string;
  @IsString() agency: string;
  @IsString() account: string;
  @IsString() accountType: string;
  @IsOptional() @IsString() pixKey?: string;
}

export class CreateEmployeeDto {
  @ApiPropertyOptional({ description: 'Código do funcionário (gerado automaticamente se não informado)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  employeeCode?: string;

  @ApiProperty({ example: 'João' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'joao.silva@empresa.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({ example: '12.345.678-9' })
  @IsOptional()
  @IsString()
  rg?: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ example: '2024-01-01', description: 'Data de admissão' })
  @IsDateString()
  hireDate: string;

  @ApiPropertyOptional({ description: 'ID do cargo' })
  @IsOptional()
  @IsUUID()
  positionId?: string;

  @ApiPropertyOptional({ description: 'ID do departamento' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'ID da escala de trabalho' })
  @IsOptional()
  @IsUUID()
  workScheduleId?: string;

  @ApiPropertyOptional({ description: 'ID do usuário vinculado ao sistema' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ enum: ContractType, default: ContractType.CLT })
  @IsEnum(ContractType)
  contractType: ContractType;

  @ApiPropertyOptional({ example: 5000.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  salary?: number;

  @ApiPropertyOptional({ enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ description: 'URL da foto do funcionário' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @IsObject()
  address?: AddressDto;

  @ApiPropertyOptional({ type: EmergencyContactDto })
  @IsOptional()
  @IsObject()
  emergencyContact?: EmergencyContactDto;

  @ApiPropertyOptional({ type: BankInfoDto })
  @IsOptional()
  @IsObject()
  bankInfo?: BankInfoDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
