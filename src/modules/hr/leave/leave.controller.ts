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
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ApproveLeaveDto, RejectLeaveDto } from './dto/review-leave.dto';
import { FilterLeaveDto } from './dto/filter-leave.dto';
import { TenantGuard } from '../../tenant/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('HR - Afastamentos / Férias')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('hr/leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @ApiOperation({ summary: 'Solicitar afastamento / férias' })
  create(@Body() dto: CreateLeaveDto) {
    return this.leaveService.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Listar afastamentos com filtros' })
  findAll(@Query() filter: FilterLeaveDto) {
    return this.leaveService.findAll(filter);
  }

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Resumo anual de afastamentos por funcionário' })
  @ApiQuery({ name: 'employeeId', required: true, type: String })
  @ApiQuery({ name: 'year', required: false, type: Number })
  summary(
    @Query('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('year') year?: string,
  ) {
    return this.leaveService.summaryByEmployee(
      employeeId,
      year ? parseInt(year) : new Date().getFullYear(),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar afastamento por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.leaveService.findOne(id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Aprovar afastamento' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveLeaveDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.leaveService.approve(id, dto, userId);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Rejeitar afastamento' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLeaveDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.leaveService.reject(id, dto, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar próprio afastamento (pelo funcionário)' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.leaveService.cancel(id, employeeId);
  }
}
