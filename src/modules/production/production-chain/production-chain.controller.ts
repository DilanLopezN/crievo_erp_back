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
import { ProductionChainService } from './production-chain.service';
import { CreateProductionChainDto } from './dto/create-production-chain.dto';
import { UpdateProductionChainDto } from './dto/update-production-chain.dto';
import { FilterProductionChainDto } from './dto/filter-production-chain.dto';
import { TenantGuard } from '@/modules/tenant/tenant.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Produção - Cadeias Produtivas')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('production/chains')
export class ProductionChainController {
  constructor(
    private readonly chainService: ProductionChainService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar cadeia produtiva com etapas' })
  create(@Body() dto: CreateProductionChainDto) {
    return this.chainService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cadeias produtivas' })
  findAll(@Query() filter: FilterProductionChainDto) {
    return this.chainService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cadeia produtiva por ID com etapas' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.chainService.findOne(id);
  }

  @Post(':id/duplicate')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Duplicar cadeia produtiva' })
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name: string; code?: string },
  ) {
    return this.chainService.duplicate(id, body.name, body.code);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar cadeia produtiva' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductionChainDto,
  ) {
    return this.chainService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover cadeia produtiva' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.chainService.remove(id);
  }
}
