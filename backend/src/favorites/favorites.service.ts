import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { User } from '../users/entities/user.entity';
import { WatchItem } from '../watch-items/entities/watch-item.entity';
@Injectable()
export class FavoritesService {
  private canSeeUnpublished(roles: string[]) {
    return roles.some((role) =>
      ['ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE', 'OPERATEUR_VEILLE'].includes(role));
  }

  constructor(
    @InjectRepository(Favorite) private favRepo: Repository<Favorite>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(WatchItem) private itemRepo: Repository<WatchItem>,
  ) {}
  async add(userId: number, itemId: number, roles: string[]) {
    const [user, item] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.itemRepo.findOne({ where: { id: itemId } }),
    ]);
    if (!user || !item || (!this.canSeeUnpublished(roles) && item.status !== 'PUBLIE'))
      throw new NotFoundException('Utilisateur ou élément introuvable');
    const existing = await this.favRepo.findOne({
      where: { userId, watchItemId: itemId },
    });
    if (existing) return existing;
    return this.favRepo.save(
      this.favRepo.create({
        userId,
        watchItemId: itemId,
        user,
        watchItem: item,
      }),
    );
  }
  async remove(userId: number, itemId: number) {
    await this.favRepo.delete({ userId, watchItemId: itemId });
    return { success: true };
  }
  list(userId: number, roles: string[]) {
    const canSeeUnpublished = this.canSeeUnpublished(roles);
    return this.favRepo.find({
      where: canSeeUnpublished ? { userId } : { userId, watchItem: { status: 'PUBLIE' } },
      relations: { watchItem: { source: true } },
      order: { addedAt: 'DESC' },
    });
  }
}
