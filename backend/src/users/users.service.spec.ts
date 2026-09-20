import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';

import { AuditService } from '../audit/audit.service';
import { Role } from '../roles/entities/role.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('ne retourne comme assignables que les comptes actifs', async () => {
    const repository = { find: vi.fn().mockResolvedValue([]) };
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: getRepositoryToken(Role), useValue: {} },
        { provide: AuditService, useValue: { log: vi.fn() } },
      ],
    }).compile();

    await module.get(UsersService).findAssignable();
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'ACTIVE' } }),
    );
  });
});
