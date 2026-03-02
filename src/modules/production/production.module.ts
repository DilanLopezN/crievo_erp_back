import { Module } from '@nestjs/common';
import { ProductModule } from './product/product.module';
import { BillOfMaterialsModule } from './bill-of-materials/bill-of-materials.module';
import { ProductionChainModule } from './production-chain/production-chain.module';
import { WorkCenterModule } from './work-center/work-center.module';
import { ProductionOrderModule } from './production-order/production-order.module';
import { QualityInspectionModule } from './quality-inspection/quality-inspection.module';
import { CapacityPlanModule } from './capacity-plan/capacity-plan.module';
import { ProductionDashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ProductModule,
    BillOfMaterialsModule,
    ProductionChainModule,
    WorkCenterModule,
    ProductionOrderModule,
    QualityInspectionModule,
    CapacityPlanModule,
    ProductionDashboardModule,
  ],
})
export class ProductionModule {}
