import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';

import { Permission } from './entities/permission.entity';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  it('retourne les permissions du dépôt', async () => {
    const permissions = [{ id: 1, name: 'READ' }];
    const repository = { find: vi.fn().mockResolvedValue(permissions) };
    const module = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: getRepositoryToken(Permission), useValue: repository },
      ],
    }).compile();

    await expect(module.get(PermissionsService).findAll()).resolves.toEqual(permissions);
  });
});
