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
import { PositionService } from './position.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { TenantGuard } from '../../tenant/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('HR - Cargos')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('hr/positions')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar cargo' })
  create(@Body() dto: CreatePositionDto) {
    return this.positionService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cargos' })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  findAll(
    @Query('departmentId') departmentId?: string,
    @Query('onlyActive') onlyActive?: string,
  ) {
    return this.positionService.findAll(departmentId, onlyActive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cargo por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.positionService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar cargo' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePositionDto) {
    return this.positionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover cargo' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.positionService.remove(id);
  }
}
