import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaxonomyService } from './taxonomy.service';

describe('TaxonomyService — hiérarchie des thèmes', () => {
  let service: TaxonomyService;
  let topics: Array<{
    id: number;
    label: string;
    description: string | null;
    parent: { id: number } | null;
  }>;

  beforeEach(() => {
    topics = [];
    const repository = {
      create: vi.fn((value) => ({ ...value })),
      save: vi.fn(async (value) => {
        if (!value.id) {
          value.id = topics.length + 1;
          topics.push(value);
        }
        return value;
      }),
      findOne: vi.fn(async ({ where }: { where: { id: number } }) =>
        topics.find((topic) => topic.id === where.id) ?? null),
      find: vi.fn(async () => topics),
      delete: vi.fn(),
    };
    const dataSource = { getRepository: vi.fn(() => repository) };
    const auditService = { log: vi.fn().mockResolvedValue(undefined) };
    service = new TaxonomyService(dataSource as never, auditService as never);
  });

  it('crée le premier thème sans parent', async () => {
    const created = await service.create('topics', {
      label: 'Qualité',
      parentId: null,
    });

    expect(created).toMatchObject({ id: 1, label: 'Qualité', parent: null });
  });

  it('permet d’attribuer plus tard un parent au premier thème', async () => {
    const first = await service.create('topics', { label: 'Qualité', parentId: null });
    const parent = await service.create('topics', { label: 'Management', parentId: null });

    const updated = await service.update('topics', first.id, { parentId: parent.id });

    expect(updated.parent).toMatchObject({ id: parent.id, label: 'Management' });
  });

  it('refuse qu’un thème devienne son propre parent', async () => {
    const topic = await service.create('topics', { label: 'Qualité', parentId: null });

    await expect(service.update('topics', topic.id, { parentId: topic.id }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse une boucle entre un thème parent et son descendant', async () => {
    const parent = await service.create('topics', { label: 'Qualité', parentId: null });
    const child = await service.create('topics', {
      label: 'Audit qualité',
      parentId: parent.id,
    });

    await expect(service.update('topics', parent.id, { parentId: child.id }))
      .rejects.toMatchObject({ message: 'La hiérarchie des thèmes ne peut pas contenir de cycle.' });
  });
});
