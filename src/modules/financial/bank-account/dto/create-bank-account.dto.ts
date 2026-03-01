import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, Min, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBankAccountDto {
  @ApiProperty({ example: 'Conta Corrente Bradesco' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Bradesco' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bank?: string;

  @ApiPropertyOptional({ example: '1234' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  agency?: string;

  @ApiPropertyOptional({ example: '12345-6' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'corrente', description: 'corrente, poupança, investimento' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountType?: string;

  @ApiPropertyOptional({ example: 'email@email.com' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pixKey?: string;

  @ApiPropertyOptional({ example: 10000.00, description: 'Saldo inicial da conta' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  initialBalance?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
