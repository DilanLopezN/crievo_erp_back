import { Module } from '@nestjs/common';
import { BillOfMaterialsController } from './bill-of-materials.controller';
import { BillOfMaterialsService } from './bill-of-materials.service';

@Module({
  controllers: [BillOfMaterialsController],
  providers: [BillOfMaterialsService],
  exports: [BillOfMaterialsService],
})
export class BillOfMaterialsModule {}
