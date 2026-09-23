import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { Topic } from './entities/topic.entity';
import { Domain } from './entities/domain.entity';
import { Laboratory } from './entities/laboratory.entity';
import { Keyword } from './entities/keyword.entity';
import { KeywordSynonym } from './entities/keyword-synonym.entity';
import { CreateTopicDto, UpdateTopicDto, CreateNamedTermDto, UpdateNamedTermDto, CreateKeywordDto, UpdateKeywordDto, CreateSynonymDto, UpdateSynonymDto } from './dto/taxonomy.dto';
import { AuditService } from '../audit/audit.service';

const entities = { topics: Topic, domains: Domain, laboratories: Laboratory, keywords: Keyword, synonyms: KeywordSynonym };
export type TaxonomyKind = keyof typeof entities;
type TaxonomyPayload = CreateTopicDto | UpdateTopicDto | CreateNamedTermDto | UpdateNamedTermDto | CreateKeywordDto | UpdateKeywordDto | CreateSynonymDto | UpdateSynonymDto;

@Injectable()
export class TaxonomyService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  private readonly auditNames: Record<TaxonomyKind, { action: string; entity: string }> = {
    topics: { action: 'TOPIC', entity: 'topics' },
    domains: { action: 'DOMAIN', entity: 'domains' },
    laboratories: { action: 'LABORATORY', entity: 'laboratories' },
    keywords: { action: 'KEYWORD', entity: 'keywords' },
    synonyms: { action: 'KEYWORD_SYNONYM', entity: 'keyword_synonyms' },
  };

  private repository(kind: TaxonomyKind): Repository<ObjectLiteral> {
    return this.dataSource.getRepository(entities[kind]);
  }

  private relations(kind: TaxonomyKind): Record<string, boolean> {
    if (kind === 'topics') return { parent: true };
    if (kind === 'keywords') return { synonyms: true };
    if (kind === 'synonyms') return { keyword: true };
    return {};
  }

  list(kind: TaxonomyKind) {
    return this.repository(kind).find({
      relations: this.relations(kind),
      order: { [kind === 'domains' || kind === 'laboratories' ? 'name' : 'label']: 'ASC' },
    });
  }

  async findOne(kind: TaxonomyKind, id: number) {
    const item = await this.repository(kind).findOne({ where: { id }, relations: this.relations(kind) });
    if (!item) throw new NotFoundException('Entrée de taxonomie introuvable.');
    return item;
  }

  private async payload(kind: TaxonomyKind, dto: TaxonomyPayload, id?: number) {
    const values: ObjectLiteral = { ...dto };
    if (kind === 'topics' && 'parentId' in values) {
      const parentId = values.parentId;
      delete values.parentId;
      values.parent = parentId == null ? null : await this.findOne('topics', parentId);
      // Un thème ne peut pas devenir son propre ancêtre.
      let ancestor = values.parent;
      const visited = new Set<number>();
      while (ancestor) {
        if (ancestor.id === id || visited.has(ancestor.id)) {
          throw new BadRequestException('La hiérarchie des thèmes ne peut pas contenir de cycle.');
        }
        visited.add(ancestor.id);
        ancestor = ancestor.parent ? await this.findOne('topics', ancestor.parent.id) : null;
      }
    }
    if (kind === 'synonyms' && 'keywordId' in values) {
      values.keyword = await this.findOne('keywords', values.keywordId);
      delete values.keywordId;
    }
    return values;
  }

  private async persist(operation: () => Promise<unknown>) {
    try { return await operation(); }
    catch (error) {
      const code = (error as { driverError?: { code?: string } }).driverError?.code;
      if (code === '23505') throw new ConflictException('Cette entrée de taxonomie existe déjà.');
      if (code === '23503') throw new ConflictException('Cette entrée est utilisée ou une référence associée n’existe plus.');
      throw error;
    }
  }

  private snapshot(item: ObjectLiteral) {
    const result: Record<string, unknown> = {};
    for (const key of ['id', 'label', 'name', 'description', 'weight', 'active']) {
      if (key in item) result[key] = item[key];
    }
    if ('parent' in item) result.parentId = item.parent?.id ?? null;
    if ('keyword' in item) result.keywordId = item.keyword?.id ?? null;
    return result;
  }

  async create(kind: TaxonomyKind, dto: TaxonomyPayload, userId?: number) {
    const repository = this.repository(kind);
    const item = repository.create(await this.payload(kind, dto));
    const saved = await this.persist(() => repository.save(item)) as ObjectLiteral;
    const audit = this.auditNames[kind];
    await this.auditService.log({
      userId,
      action: `CREATE_${audit.action}`,
      entity: audit.entity,
      entityId: saved.id,
      afterValue: this.snapshot(saved),
    });
    return saved;
  }

  async update(kind: TaxonomyKind, id: number, dto: TaxonomyPayload, userId?: number) {
    const item = await this.findOne(kind, id);
    const beforeValue = this.snapshot(item);
    Object.assign(item, await this.payload(kind, dto, id));
    const saved = await this.persist(() => this.repository(kind).save(item)) as ObjectLiteral;
    const audit = this.auditNames[kind];
    await this.auditService.log({
      userId,
      action: `UPDATE_${audit.action}`,
      entity: audit.entity,
      entityId: saved.id,
      beforeValue,
      afterValue: this.snapshot(saved),
    });
    return saved;
  }

  async remove(kind: TaxonomyKind, id: number, userId?: number) {
    const item = await this.findOne(kind, id);
    const beforeValue = this.snapshot(item);
    await this.persist(() => this.repository(kind).delete(id));
    const audit = this.auditNames[kind];
    await this.auditService.log({
      userId,
      action: `DELETE_${audit.action}`,
      entity: audit.entity,
      entityId: id,
      beforeValue,
    });
    return { message: 'Entrée de taxonomie supprimée.' };
  }
}
