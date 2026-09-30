import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback;
  if (!/^\d+$/.test(value)) throw new Error(`${name} doit être un entier positif.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} doit être un entier positif.`);
  }
  return parsed;
}

function authAction(context: ExecutionContext): string | null {
  if (context.getClass().name !== 'AuthController') return null;
  return context.getHandler().name;
}

export function rateLimitOptions(config: ConfigService) {
  const windowMs = positiveInteger(
    config.get<string>('RATE_LIMIT_WINDOW_MS'), 900_000, 'RATE_LIMIT_WINDOW_MS',
  );
  const generalMax = positiveInteger(
    config.get<string>('RATE_LIMIT_MAX'), 200, 'RATE_LIMIT_MAX',
  );
  const authMax = positiveInteger(
    config.get<string>('AUTH_RATE_LIMIT_MAX'), 20, 'AUTH_RATE_LIMIT_MAX',
  );

  return [
    {
      name: 'default',
      ttl: windowMs,
      limit: generalMax,
    },
    {
      name: 'auth-ip',
      ttl: windowMs,
      limit: authMax,
      blockDuration: windowMs,
      skipIf: (context: ExecutionContext) =>
        !['login', 'refresh', 'forgotPassword', 'resetPassword'].includes(authAction(context) ?? ''),
    },
    {
      name: 'auth-email',
      ttl: windowMs,
      limit: 5,
      blockDuration: windowMs,
      skipIf: (context: ExecutionContext) =>
        !['login', 'forgotPassword'].includes(authAction(context) ?? ''),
      getTracker: (request: { ip?: string; body?: { email?: unknown } }) => {
        const email = typeof request.body?.email === 'string'
          ? request.body.email.trim().toLowerCase()
          : '';
        return email ? `email:${email}` : `ip:${request.ip ?? 'unknown'}`;
      },
    },
  ];
}
