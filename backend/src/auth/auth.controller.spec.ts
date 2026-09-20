import { ThrottlerGuard } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  it('délègue la connexion au service et pose le cookie sécurisé', async () => {
    const user = { id: 1, email: 'admin@veille.local', roles: ['ADMIN'] };
    const authService = {
      login: vi.fn().mockResolvedValue({ accessToken: 'jwt-test', user }),
    };
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    const response = { cookie: vi.fn() } as any;
    const result = await module.get(AuthController).login(
      { email: 'admin@veille.local', password: 'Admin123!' },
      response,
    );

    expect(authService.login).toHaveBeenCalledOnce();
    expect(response.cookie).toHaveBeenCalledWith(
      'access_token',
      'jwt-test',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
    expect(result).toEqual({ user });
  });
});
