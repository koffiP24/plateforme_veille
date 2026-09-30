import { ForbiddenException } from '@nestjs/common';
import { ActionsService } from './actions.service';

describe('ActionsService - accès aux actions', () => {
  it('refuse à un référent de créer une action pour un autre utilisateur', async () => {
    const itemRepository = { findOne: vi.fn() };
    const service = new ActionsService(
      { save: vi.fn() } as never,
      itemRepository as never,
      {} as never,
      {} as never,
    );

    await expect(service.create(12, {
      title: 'Analyse', actionType: 'ANALYSE_IMPACT', ownerId: 9,
    }, { id: 3, roles: ['REFERENT_LABORATOIRE'] }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(itemRepository.findOne).not.toHaveBeenCalled();
  });
});
