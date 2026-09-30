import { UnauthorizedException } from '@nestjs/common';
import { lastValueFrom, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor - échec de connexion', () => {
  it('journalise la tentative sans remplacer la réponse 401', async () => {
    const log = vi.fn().mockResolvedValue(undefined);
    const interceptor = new AuditInterceptor({ log } as never, {} as never);
    const error = new UnauthorizedException('Identifiants incorrects');
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST', originalUrl: '/api/v1/auth/login',
          body: { email: ' TEST@EXAMPLE.ORG ', password: 'secret' },
          ip: '127.0.0.1',
        }),
      }),
    } as never;
    const next = { handle: () => throwError(() => error) } as never;

    await expect(lastValueFrom(interceptor.intercept(context, next)))
      .rejects.toBe(error);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'LOGIN_FAILED', ipAddress: '127.0.0.1',
      afterValue: { email: 'test@example.org' },
    }));
  });
});
