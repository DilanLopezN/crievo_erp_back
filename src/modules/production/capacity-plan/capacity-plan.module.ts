import { Module } from '@nestjs/common';
import { CapacityPlanController } from './capacity-plan.controller';
import { CapacityPlanService } from './capacity-plan.service';

@Module({
  controllers: [CapacityPlanController],
  providers: [CapacityPlanService],
  exports: [CapacityPlanService],
})
export class CapacityPlanModule {}
