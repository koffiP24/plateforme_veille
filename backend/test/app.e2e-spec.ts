import { CanActivate, ExecutionContext, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

class TestJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const roles = String(req.headers['x-test-roles'] ?? '').split(',').filter(Boolean);
    if (!roles.length) return false;
    req.user = { id: 1, roles };
    return true;
  }
}

describe('API (e2e)', () => {
  it('valide le login, pose le cookie et protège les utilisateurs', async () => {
    const authService = {
      login: vi.fn().mockResolvedValue({
        accessToken: 'jwt-e2e',
        user: { id: 1, email: 'admin@veille.local', roles: ['ADMIN'] },
      }),
    };
    const module = await Test.createTestingModule({
      controllers: [AuthController, UsersController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: { findAll: () => [] } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    const app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    try {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'invalide', password: 'court' })
        .expect(400);
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@veille.local', password: 'Admin123!' })
        .expect(201);
      expect(login.headers['set-cookie']?.[0]).toContain('HttpOnly');
      expect(login.body.user.roles).toEqual(['ADMIN']);
      await request(app.getHttpServer()).get('/api/v1/users').expect(403);
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('x-test-roles', 'ADMIN')
        .expect(200, []);
    } finally {
      await app.close();
    }
  });
});
