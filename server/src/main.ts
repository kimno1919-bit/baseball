import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 전역 ValidationPipe 등록 (DTO 유효성 자동 검증)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // CORS 활성화
  app.enableCors({
    origin: true, // 로컬 FE 우회 연동 허용
    credentials: true,
  });

  // API 글로벌 경로 프리픽스 설정
  app.setGlobalPrefix('api');

  await app.listen(4000);
  console.log('NestJS Backend Server is running on: http://localhost:4000/api');
}
bootstrap();
