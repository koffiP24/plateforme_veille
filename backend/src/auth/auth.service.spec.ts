import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usersService = {
    findByEmailWithPassword: vi.fn(),
    updateLastLogin: vi.fn(),
  };
  const jwtService = { signAsync: vi.fn().mockResolvedValue('jwt-test') };
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('refuse un compte inconnu', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);
    await expect(
      service.login({ email: 'absent@example.com', password: 'MotDePasse1!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuse un compte inactif', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({ status: 'INACTIVE' });
    await expect(
      service.login({ email: 'inactif@example.com', password: 'MotDePasse1!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('retourne un jeton et le profil pour des identifiants valides', async () => {
    const passwordHash = await bcrypt.hash('MotDePasse1!', 4);
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      firstName: 'Admin',
      lastName: 'Plateforme',
      email: 'admin@veille.local',
      passwordHash,
      status: 'ACTIVE',
      roles: [{ name: 'ADMIN' }],
    });

    const result = await service.login({
      email: 'admin@veille.local',
      password: 'MotDePasse1!',
    });

    expect(result.accessToken).toBe('jwt-test');
    expect(result.user.roles).toEqual(['ADMIN']);
    expect(usersService.updateLastLogin).toHaveBeenCalledWith(1);
  });
});
