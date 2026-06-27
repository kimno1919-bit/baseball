import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService, PrismaService],
  exports: [StatsService],
})
export class StatsModule {}
// Note: Stats 집계 관련 모듈 셋업 완료
