import { Module } from '@nestjs/common';
import { WorkCenterController } from './work-center.controller';
import { WorkCenterService } from './work-center.service';

@Module({
  controllers: [WorkCenterController],
  providers: [WorkCenterService],
  exports: [WorkCenterService],
})
export class WorkCenterModule {}
