import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FollowUpAction } from './entities/follow-up-action.entity';
import { WatchItem } from '../watch-items/entities/watch-item.entity';
import { User } from '../users/entities/user.entity';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { WATCH_STATUS } from '../watch-items/constants/watch-status.constants';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ActionsService {
  constructor(
    @InjectRepository(FollowUpAction)
    private readonly actionRepository: Repository<FollowUpAction>,
    @InjectRepository(WatchItem)
    private readonly itemRepository: Repository<WatchItem>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async create(itemId: number, dto: CreateActionDto, actorId?: number) {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Élément de veille introuvable');
    const allowed = [
      WATCH_STATUS.TO_QUALIFY,
      WATCH_STATUS.VALIDATED,
      WATCH_STATUS.PUBLISHED,
    ];
    if (!allowed.includes(item.status as any))
      throw new ConflictException(
        'Impossible de créer une action pour cet élément dans son état actuel.',
      );
    const owner = await this.findAssignableOwner(dto.ownerId);
    const saved = await this.actionRepository.save(
      this.actionRepository.create({
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        actionType: dto.actionType,
        impact: dto.impact?.trim() || null,
        decision: null,
        dueDate: dto.dueDate ?? null,
        status: 'OPEN',
        watchItem: item,
        owner,
      }),
    );
    await this.auditService.log({
      userId: actorId,
      action: 'CREATE_FOLLOW_UP_ACTION',
      entity: 'follow_up_actions',
      entityId: saved.id,
      afterValue: this.auditSnapshot(saved),
    });
    return saved;
  }

  findAll(currentUser: { id: number; roles: string[] }) {
    const canSeeAll =
      currentUser.roles.includes('ADMIN') ||
      currentUser.roles.includes('RESPONSABLE_VEILLE');

    return this.actionRepository.find({
      where: canSeeAll ? {} : { owner: { id: currentUser.id } },
      relations: { watchItem: true, owner: true },
      order: { createdAt: 'DESC' },
    });
  }
  findByItem(itemId: number, currentUser: { id: number; roles: string[] }) {
    const canSeeAll =
      currentUser.roles.includes('ADMIN') ||
      currentUser.roles.includes('RESPONSABLE_VEILLE');

    return this.actionRepository.find({
      where: canSeeAll
        ? { watchItem: { id: itemId } }
        : { watchItem: { id: itemId }, owner: { id: currentUser.id } },
      relations: { owner: true },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: number,
    dto: UpdateActionDto,
    currentUser: { id: number; roles: string[] },
  ) {
    const action = await this.actionRepository.findOne({
      where: { id },
      relations: { watchItem: true, owner: true },
    });
    if (!action) throw new NotFoundException('Action introuvable');
    const privileged =
      currentUser.roles.includes('ADMIN') ||
      currentUser.roles.includes('RESPONSABLE_VEILLE');
    const isReferent = currentUser.roles.includes('REFERENT_LABORATOIRE');
    if (isReferent && !privileged && action.owner.id !== currentUser.id) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que les actions qui vous sont affectées.',
      );
    }
    const beforeValue = this.auditSnapshot(action);
    if (dto.title !== undefined) action.title = dto.title.trim();
    if (dto.description !== undefined)
      action.description = dto.description.trim() || null;
    if (dto.actionType !== undefined) action.actionType = dto.actionType;
    if (dto.ownerId !== undefined && dto.ownerId !== action.owner.id) {
      if (!privileged) {
        throw new ForbiddenException(
          'Seul un administrateur ou un responsable de veille peut réattribuer une action.',
        );
      }
      action.owner = await this.findAssignableOwner(dto.ownerId);
    }
    if (dto.status !== undefined) action.status = dto.status;
    if (dto.impact !== undefined) action.impact = dto.impact.trim() || null;
    if (dto.decision !== undefined)
      action.decision = dto.decision.trim() || null;
    if (dto.dueDate !== undefined) action.dueDate = dto.dueDate;
    const saved = await this.actionRepository.save(action);
    await this.auditService.log({
      userId: currentUser.id,
      action: 'UPDATE_FOLLOW_UP_ACTION',
      entity: 'follow_up_actions',
      entityId: saved.id,
      beforeValue,
      afterValue: this.auditSnapshot(saved),
    });
    return saved;
  }

  async countPendingForUser(userId: number) {
    const count = await this.actionRepository.count({
      where: {
        owner: { id: userId },
        status: In(['OPEN', 'IN_PROGRESS']),
      },
    });
    return { count };
  }

  async remove(
    id: number,
    currentUser: { id: number; roles: string[] },
  ) {
    const action = await this.actionRepository.findOne({
      where: { id },
      relations: { watchItem: true, owner: true },
    });
    if (!action) throw new NotFoundException('Action introuvable');

    const privileged =
      currentUser.roles.includes('ADMIN') ||
      currentUser.roles.includes('RESPONSABLE_VEILLE');
    if (!privileged && action.owner.id !== currentUser.id) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que les actions qui vous sont affectées.',
      );
    }

    const beforeValue = this.auditSnapshot(action);
    await this.actionRepository.remove(action);
    await this.auditService.log({
      userId: currentUser.id,
      action: 'DELETE_FOLLOW_UP_ACTION',
      entity: 'follow_up_actions',
      entityId: id,
      beforeValue,
    });
    return { id, deleted: true };
  }

  private async findAssignableOwner(id: number) {
    const owner = await this.userRepository.findOne({ where: { id } });
    const allowedRoles = [
      'ADMIN',
      'RESPONSABLE_VEILLE',
      'REFERENT_LABORATOIRE',
    ];
    if (
      !owner ||
      owner.status !== 'ACTIVE' ||
      !owner.roles.some((role) => allowedRoles.includes(role.name))
    ) {
      throw new NotFoundException(
        'Le responsable doit être un utilisateur actif autorisé à exécuter des actions.',
      );
    }
    return owner;
  }

  private auditSnapshot(action: FollowUpAction) {
    const ownerName = action.owner
      ? `${action.owner.firstName} ${action.owner.lastName}`.trim() || action.owner.email
      : null;
    return {
      title: action.title,
      actionType: action.actionType,
      impact: action.impact,
      decision: action.decision,
      dueDate: action.dueDate,
      status: action.status,
      owner: ownerName,
      watchItem: action.watchItem?.title ?? null,
    };
  }
}
