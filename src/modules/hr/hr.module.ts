import { Module } from '@nestjs/common';
import { DepartmentModule } from './department/department.module';
import { PositionModule } from './position/position.module';
import { WorkScheduleModule } from './work-schedule/work-schedule.module';
import { EmployeeModule } from './employee/employee.module';
import { TimeRecordModule } from './time-record/time-record.module';
import { LeaveModule } from './leave/leave.module';

@Module({
  imports: [
    DepartmentModule,
    PositionModule,
    WorkScheduleModule,
    EmployeeModule,
    TimeRecordModule,
    LeaveModule,
  ],
})
export class HrModule {}
