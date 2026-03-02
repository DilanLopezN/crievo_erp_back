import { Module } from '@nestjs/common';
import { ProductionDashboardController } from './dashboard.controller';
import { ProductionDashboardService } from './dashboard.service';

@Module({
  controllers: [ProductionDashboardController],
  providers: [ProductionDashboardService],
})
export class ProductionDashboardModule {}
