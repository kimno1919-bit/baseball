import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
// Note: JwtAuthGuard, RolesGuard 등도 Providers에 내장될 수 있으나 전역 가드로 app.module에서 제어
