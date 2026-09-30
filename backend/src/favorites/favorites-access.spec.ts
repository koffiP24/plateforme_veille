import { NotFoundException } from '@nestjs/common';
import { FavoritesService } from './favorites.service';

describe('FavoritesService - visibilité', () => {
  const userRepo = { findOne: vi.fn().mockResolvedValue({ id: 3 }) };
  const itemRepo = { findOne: vi.fn().mockResolvedValue({ id: 12, status: 'NOUVEAU' }) };
  const favRepo = { findOne: vi.fn(), save: vi.fn(), find: vi.fn() };
  const service = new FavoritesService(favRepo as never, userRepo as never, itemRepo as never);

  it('ne permet pas à un lecteur de mettre en favori une veille non publiée', async () => {
    await expect(service.add(3, 12, ['LECTEUR'])).rejects.toBeInstanceOf(NotFoundException);
    expect(favRepo.save).not.toHaveBeenCalled();
  });

  it('filtre aussi les anciens favoris non publiés du lecteur', () => {
    service.list(3, ['LECTEUR']);
    expect(favRepo.find).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 3, watchItem: { status: 'PUBLIE' } },
    }));
  });
});
