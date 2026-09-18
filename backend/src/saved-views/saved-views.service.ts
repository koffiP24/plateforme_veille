import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedView } from './entities/saved-view.entity';
import { User } from '../users/entities/user.entity';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
@Injectable()
export class SavedViewsService {
  constructor(
    @InjectRepository(SavedView) private repo: Repository<SavedView>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}
  async create(userId: number, dto: CreateSavedViewDto) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return this.repo.save(
      this.repo.create({ name: dto.name, filters: dto.filters, user }),
    );
  }
  list(userId: number) {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }
  async remove(userId: number, id: number) {
    const view = await this.repo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!view) throw new NotFoundException('Vue introuvable');
    await this.repo.remove(view);
    return { success: true };
  }
}
