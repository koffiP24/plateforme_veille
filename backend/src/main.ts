import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(AppModule);

  const production = process.env.NODE_ENV === 'production';
  if (production) app.set('trust proxy', 'loopback');
  app.use(helmet({
    strictTransportSecurity: production
      ? { maxAge: 31_536_000, includeSubDomains: false }
      : false,
  }));
  app.use(cookieParser());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (production && !process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL est obligatoire en production.');
  }
  for (const origin of allowedOrigins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Origine frontend invalide : ${origin}`);
    }
    if (parsed.origin !== origin || parsed.username || parsed.password ||
      (production && parsed.protocol !== 'https:')) {
      throw new Error(`Origine frontend non autorisée : ${origin}`);
    }
  }
  if (!allowedOrigins.length) throw new Error('Aucune origine frontend autorisée.');

  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origine non autorisée par la politique CORS.'));
    },

    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port =
    Number(process.env.PORT) || 3000;

  await app.listen(port, process.env.BIND_HOST ?? (production ? '127.0.0.1' : '0.0.0.0'));

  Logger.log(`Backend disponible sur http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
