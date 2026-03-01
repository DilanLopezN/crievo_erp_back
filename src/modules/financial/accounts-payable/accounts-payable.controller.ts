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
import { AccountsPayableService } from './accounts-payable.service';
import { CreateAccountPayableDto } from './dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from './dto/update-account-payable.dto';
import { FilterAccountPayableDto } from './dto/filter-account-payable.dto';
import { PayAccountDto } from './dto/pay-account.dto';
import { TenantGuard } from '../../tenant/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Financeiro - Contas a Pagar')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('financial/accounts-payable')
export class AccountsPayableController {
  constructor(private readonly service: AccountsPayableService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar conta a pagar' })
  create(@Body() dto: CreateAccountPayableDto) {
    return this.service.create(dto);
  }

  @Post('installments/:total')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar conta a pagar parcelada' })
  createInstallments(
    @Body() dto: CreateAccountPayableDto,
    @Param('total') total: string,
  ) {
    return this.service.createInstallments(dto, parseInt(total, 10));
  }

  @Get()
  @ApiOperation({ summary: 'Listar contas a pagar com filtros e paginação' })
  findAll(@Query() filter: FilterAccountPayableDto) {
    return this.service.findAll(filter);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo de contas a pagar por período' })
  getSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getSummary(startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar conta a pagar por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar conta a pagar' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAccountPayableDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/pay')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Registrar pagamento (total ou parcial)' })
  pay(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PayAccountDto) {
    return this.service.pay(id, dto);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Cancelar conta a pagar' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover conta a pagar' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
