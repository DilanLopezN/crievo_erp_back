import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReconcileDto {
  @ApiProperty({ description: 'ID da linha do extrato bancário' })
  @IsUUID()
  bankStatementId: string;

  @ApiProperty({ description: 'ID da transação do sistema para conciliar' })
  @IsUUID()
  transactionId: string;
}
