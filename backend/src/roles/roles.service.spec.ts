import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';

import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  it('charge les rôles avec leurs permissions', async () => {
    const repository = { find: vi.fn().mockResolvedValue([]) };
    const module = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Role), useValue: repository },
      ],
    }).compile();

    await module.get(RolesService).findAll();
    expect(repository.find).toHaveBeenCalledWith({ relations: { permissions: true } });
  });
});
