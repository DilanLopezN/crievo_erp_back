import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TimeRecordService } from './time-record.service';
import { ClockActionDto } from './dto/clock-action.dto';
import { AdjustTimeRecordDto } from './dto/adjust-time-record.dto';
import { FilterTimeRecordDto } from './dto/filter-time-record.dto';
import { TenantGuard } from '../../tenant/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('HR - Registro de Ponto')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('hr/time-records')
export class TimeRecordController {
  constructor(private readonly timeRecordService: TimeRecordService) {}

  // ──────────────────────────────────────────────
  // Clock actions (funcionário usa seu próprio ID)
  // ──────────────────────────────────────────────

  @Post('employees/:employeeId/clock-in')
  @ApiOperation({ summary: 'Registrar entrada (bater ponto de entrada)' })
  clockIn(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: ClockActionDto,
  ) {
    return this.timeRecordService.clockIn(employeeId, dto);
  }

  @Post('employees/:employeeId/lunch-start')
  @ApiOperation({ summary: 'Registrar início do intervalo de almoço' })
  lunchStart(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: ClockActionDto,
  ) {
    return this.timeRecordService.lunchStart(employeeId, dto);
  }

  @Post('employees/:employeeId/lunch-end')
  @ApiOperation({ summary: 'Registrar retorno do almoço' })
  lunchEnd(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: ClockActionDto,
  ) {
    return this.timeRecordService.lunchEnd(employeeId, dto);
  }

  @Post('employees/:employeeId/clock-out')
  @ApiOperation({ summary: 'Registrar saída (bater ponto de saída)' })
  clockOut(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: ClockActionDto,
  ) {
    return this.timeRecordService.clockOut(employeeId, dto);
  }

  @Get('employees/:employeeId/today')
  @ApiOperation({ summary: 'Ver registro de ponto de hoje do funcionário' })
  getToday(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.timeRecordService.getToday(employeeId);
  }

  // ──────────────────────────────────────────────
  // Listagem e relatórios
  // ──────────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Listar registros de ponto com filtros' })
  findAll(@Query() filter: FilterTimeRecordDto) {
    return this.timeRecordService.findAll(filter);
  }

  @Get('report')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Relatório de ponto por funcionário e período' })
  @ApiQuery({ name: 'employeeId', required: true, type: String })
  @ApiQuery({ name: 'startDate', required: true, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, type: String, example: '2024-01-31' })
  report(
    @Query('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.timeRecordService.report(employeeId, startDate, endDate);
  }

  // ──────────────────────────────────────────────
  // Ajuste / aprovação (gestores)
  // ──────────────────────────────────────────────

  @Patch(':id/adjust')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Ajustar / aprovar / rejeitar registro de ponto' })
  adjust(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustTimeRecordDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.timeRecordService.adjust(id, dto, userId);
  }
}
