import { NotificationsService } from './notifications.service';

function createService(subscriptions: Array<Record<string, unknown>>) {
  const item = {
    id: 25,
    title: 'Nouvelle publication de veille',
    source: { id: 4 },
    domains: [{ id: 8 }],
    topicLinks: [{ topic: { id: 12 } }],
    keywordLinks: [{ keyword: { id: 16 } }],
  };
  const notificationRepository = {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: 1, ...value })),
  };
  const subscriptionRepository = { find: vi.fn().mockResolvedValue(subscriptions) };
  const itemRepository = { findOne: vi.fn().mockResolvedValue(item) };
  const service = new NotificationsService(
    notificationRepository as never,
    subscriptionRepository as never,
    itemRepository as never,
  );
  return { service, notificationRepository };
}

describe('NotificationsService publication', () => {
  it('crée une notification non lue pour un abonnement à la source', async () => {
    const user = { id: 7 };
    const { service, notificationRepository } = createService([{
      subscriptionType: 'SOURCE',
      source: { id: 4 },
      topic: null,
      domain: null,
      keyword: null,
      channel: 'IN_APP',
      user,
    }]);

    await service.onPublished({ watchItemId: 25 });

    expect(notificationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Nouvelle veille publiée',
      message: 'Nouvelle publication de veille',
      readAt: null,
      user,
    }));
  });

  it('crée une notification non lue pour un abonnement au thème', async () => {
    const user = { id: 9 };
    const { service, notificationRepository } = createService([{
      subscriptionType: 'TOPIC',
      source: null,
      topic: { id: 12 },
      domain: null,
      keyword: null,
      channel: 'IN_APP',
      user,
    }]);

    await service.onPublished({ watchItemId: 25 });

    expect(notificationRepository.save).toHaveBeenCalledOnce();
    expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({ readAt: null, user }));
  });

  it('ne notifie pas un abonnement qui ne correspond pas à la veille', async () => {
    const { service, notificationRepository } = createService([{
      subscriptionType: 'SOURCE',
      source: { id: 99 },
      topic: null,
      domain: null,
      keyword: null,
      channel: 'IN_APP',
      user: { id: 10 },
    }]);

    await service.onPublished({ watchItemId: 25 });

    expect(notificationRepository.save).not.toHaveBeenCalled();
  });
});
