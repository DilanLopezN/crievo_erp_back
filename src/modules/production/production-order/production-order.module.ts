import { Module } from '@nestjs/common';
import { ProductionOrderController } from './production-order.controller';
import { ProductionOrderService } from './production-order.service';

@Module({
  controllers: [ProductionOrderController],
  providers: [ProductionOrderService],
  exports: [ProductionOrderService],
})
export class ProductionOrderModule {}
