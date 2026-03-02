import { Module } from '@nestjs/common';
import { ProductionChainController } from './production-chain.controller';
import { ProductionChainService } from './production-chain.service';

@Module({
  controllers: [ProductionChainController],
  providers: [ProductionChainService],
  exports: [ProductionChainService],
})
export class ProductionChainModule {}
