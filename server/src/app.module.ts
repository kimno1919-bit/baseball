import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SeasonsModule } from './seasons/seasons.module';
import { GamesModule } from './games/games.module';
import { StatsModule } from './stats/stats.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    SeasonsModule,
    GamesModule,
    StatsModule,
    NotificationsModule,
  ],
  providers: [
    PrismaService,
    // 전역 RolesGuard 제공 (메타데이터 롤 체크용)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
