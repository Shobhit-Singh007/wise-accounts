import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { SentryInterceptor } from './common/sentry.interceptor';
import { CloudWatchLogger } from './common/cloudwatch.logger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: process.env.NODE_ENV === 'production' ? new CloudWatchLogger() : undefined,
  });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.useGlobalInterceptors(new SentryInterceptor());

  app.setGlobalPrefix('api/v1');

  app.use(helmet());

  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
  if (corsOrigin === '*') {
    logger.warn('CORS_ORIGIN is set to "*". In production, specify explicit origins for security.');
  }

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Wise Accounts API')
    .setDescription('APIs for accounting, billing, inventory, customer ledger, payments, and reports')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`API docs at http://localhost:${port}/api/docs`);
}
bootstrap();
