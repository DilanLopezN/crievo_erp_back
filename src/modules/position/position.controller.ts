import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PositionService } from './position.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { TenantGuard } from '@/modules/tenant';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';

@ApiTags('Positions')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('positions')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new position (cargo)' })
  create(@Body() dto: CreatePositionDto) {
    return this.positionService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all positions in tenant' })
  findAll() {
    return this.positionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get position by ID' })
  findById(@Param('id') id: string) {
    return this.positionService.findById(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a position' })
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.positionService.update(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a position' })
  remove(@Param('id') id: string) {
    return this.positionService.remove(id);
  }
}
