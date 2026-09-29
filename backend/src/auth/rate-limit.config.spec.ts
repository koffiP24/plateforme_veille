import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';

import { rateLimitOptions } from './rate-limit.config';

@Controller('api/v1/auth')
class AuthController {
  @Post('login')
  login(@Body() _body: unknown) { return { ok: true }; }

  @Post('refresh')
  refresh() { return { ok: true }; }
}

@Controller('data')
class DataController {
  @Get()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  read() { return { ok: true }; }
}

describe('limites HTTP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const config = {
      get: (key: string) => ({
        RATE_LIMIT_WINDOW_MS: '60000',
        RATE_LIMIT_MAX: '200',
        AUTH_RATE_LIMIT_MAX: '20',
      })[key],
    } as ConfigService;
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(rateLimitOptions(config))],
      controllers: [AuthController, DataController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('limite les routes ordinaires par IP', async () => {
    for (let index = 0; index < 3; index++) {
      await request(app.getHttpServer()).get('/data').expect(200);
    }
    await request(app.getHttpServer()).get('/data').expect(429);
  });

  it('limite la connexion à cinq tentatives par adresse, sans distinction de casse', async () => {
    for (let index = 0; index < 5; index++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: index % 2 ? 'Alice@Example.org' : 'alice@example.org' })
        .expect(201);
    }
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'alice@example.org' })
      .expect(429);
  });

  it('protège le rafraîchissement par IP sans appliquer la limite par adresse', async () => {
    for (let index = 0; index < 6; index++) {
      await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(201);
    }
    for (let index = 6; index < 20; index++) {
      await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(201);
    }
    await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(429);
  });

  it('rejette une configuration non numérique', () => {
    const badConfig = {
      get: (key: string) => key === 'RATE_LIMIT_MAX' ? 'aucune limite' : undefined,
    } as ConfigService;
    expect(() => rateLimitOptions(badConfig)).toThrow('RATE_LIMIT_MAX');
  });
});
