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
import { BillOfMaterialsService } from './bill-of-materials.service';
import { CreateBomDto } from './dto/create-bom.dto';
import { UpdateBomDto } from './dto/update-bom.dto';
import { FilterBomDto } from './dto/filter-bom.dto';
import { TenantGuard } from '@/modules/tenant/tenant.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Produção - Lista de Materiais (BOM)')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('production/bom')
export class BillOfMaterialsController {
  constructor(private readonly bomService: BillOfMaterialsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar lista de materiais (BOM)' })
  create(@Body() dto: CreateBomDto) {
    return this.bomService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar BOMs com filtros' })
  findAll(@Query() filter: FilterBomDto) {
    return this.bomService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar BOM por ID com itens' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bomService.findOne(id);
  }

  @Get(':id/cost')
  @ApiOperation({ summary: 'Calcular custo estimado do BOM' })
  calculateCost(@Param('id', ParseUUIDPipe) id: string) {
    return this.bomService.calculateCost(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar BOM' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBomDto,
  ) {
    return this.bomService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover BOM' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bomService.remove(id);
  }
}
