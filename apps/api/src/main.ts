import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  // ── Validate required env vars ────────────────────────────
  const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
  for (const varName of requiredVars) {
    if (!configService.get<string>(varName.replace('_', '.').toLowerCase())) {
      if (!process.env[varName]) {
        logger.error(`Missing required environment variable: ${varName}`);
        process.exit(1);
      }
    }
  }

  // ── Security ──────────────────────────────────────────────
  app.use(helmet());
  app.use(cookieParser());

  // ── CORS ─────────────────────────────────────────────────
  app.enableCors({
    origin: [
      configService.get<string>('WEB_URL', 'http://localhost:3000'),
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global Prefix & Versioning ────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ── Global Pipes ──────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Swagger (Dev only) ────────────────────────────────────
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('DNSC HMS API')
      .setDescription('Hostel Management System REST API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    logger.log(`Swagger available at http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();
