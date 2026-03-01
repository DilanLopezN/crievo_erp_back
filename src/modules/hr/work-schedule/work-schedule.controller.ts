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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkScheduleService } from './work-schedule.service';
import { CreateWorkScheduleDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';
import { TenantGuard } from '../../tenant/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('HR - Escalas de Trabalho')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('hr/work-schedules')
export class WorkScheduleController {
  constructor(private readonly workScheduleService: WorkScheduleService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar escala de trabalho' })
  create(@Body() dto: CreateWorkScheduleDto) {
    return this.workScheduleService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar escalas de trabalho' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  findAll(@Query('onlyActive') onlyActive?: string) {
    return this.workScheduleService.findAll(onlyActive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar escala por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workScheduleService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar escala de trabalho' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkScheduleDto) {
    return this.workScheduleService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover escala de trabalho' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.workScheduleService.remove(id);
  }
}
