import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { TenantGuard } from '../../tenant/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Financeiro - Contas Bancárias')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('financial/bank-accounts')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar conta bancária' })
  create(@Body() dto: CreateBankAccountDto) {
    return this.bankAccountService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contas bancárias' })
  findAll(@Query('search') search?: string) {
    return this.bankAccountService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar conta bancária por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bankAccountService.findOne(id);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Consultar saldo da conta bancária' })
  getBalance(@Param('id', ParseUUIDPipe) id: string) {
    return this.bankAccountService.getBalance(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar conta bancária' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBankAccountDto) {
    return this.bankAccountService.update(id, dto);
  }

  @Post(':id/recalculate-balance')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Recalcular saldo da conta bancária' })
  recalculateBalance(@Param('id', ParseUUIDPipe) id: string) {
    return this.bankAccountService.recalculateBalance(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover conta bancária' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bankAccountService.remove(id);
  }
}
