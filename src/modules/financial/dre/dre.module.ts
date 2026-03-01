import { Module } from '@nestjs/common';
import { DreController } from './dre.controller';
import { DreService } from './dre.service';

@Module({
  controllers: [DreController],
  providers: [DreService],
  exports: [DreService],
})
export class DreModule {}
