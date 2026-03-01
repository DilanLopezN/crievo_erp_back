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
import { AccountsReceivableService } from './accounts-receivable.service';
import { CreateAccountReceivableDto } from './dto/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from './dto/update-account-receivable.dto';
import { FilterAccountReceivableDto } from './dto/filter-account-receivable.dto';
import { ReceiveAccountDto } from './dto/receive-account.dto';
import { TenantGuard } from '../../tenant/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Financeiro - Contas a Receber')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('financial/accounts-receivable')
export class AccountsReceivableController {
  constructor(private readonly service: AccountsReceivableService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar conta a receber' })
  create(@Body() dto: CreateAccountReceivableDto) {
    return this.service.create(dto);
  }

  @Post('installments/:total')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar conta a receber parcelada' })
  createInstallments(
    @Body() dto: CreateAccountReceivableDto,
    @Param('total') total: string,
  ) {
    return this.service.createInstallments(dto, parseInt(total, 10));
  }

  @Get()
  @ApiOperation({ summary: 'Listar contas a receber com filtros e paginação' })
  findAll(@Query() filter: FilterAccountReceivableDto) {
    return this.service.findAll(filter);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo de contas a receber por período' })
  getSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getSummary(startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar conta a receber por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar conta a receber' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAccountReceivableDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/receive')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Registrar recebimento (total ou parcial)' })
  receive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReceiveAccountDto) {
    return this.service.receive(id, dto);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Cancelar conta a receber' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover conta a receber' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
