import { describe, expect, it, vi } from 'vitest';

const clients = vi.hoisted(() => ({
  api: {
    interceptors: { response: { use: vi.fn() } },
    request: vi.fn(),
  },
  refresh: { post: vi.fn() },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn()
      .mockReturnValueOnce(clients.api)
      .mockReturnValueOnce(clients.refresh),
  },
}));

import api from './api';

const onError = clients.api.interceptors.response.use.mock.calls[0][1] as
  (error: unknown) => Promise<unknown>;

describe('renouvellement de session HTTP', () => {
  it('partage un renouvellement entre plusieurs requêtes expirées puis les rejoue', async () => {
    expect(api).toBe(clients.api);
    let finishRefresh!: () => void;
    clients.refresh.post.mockReturnValueOnce(new Promise<void>((resolve) => {
      finishRefresh = resolve;
    }));
    clients.api.request.mockResolvedValue({ data: 'ok' });
    const first = { response: { status: 401, data: {} }, config: { url: '/watch-items' } };
    const second = { response: { status: 401, data: {} }, config: { url: '/notifications' } };

    const results = [onError(first), onError(second)];
    expect(clients.refresh.post).toHaveBeenCalledTimes(1);
    finishRefresh();
    await expect(Promise.all(results)).resolves.toEqual([{ data: 'ok' }, { data: 'ok' }]);
    expect(clients.api.request).toHaveBeenCalledTimes(2);
    expect(first.config).toMatchObject({ _retriedAfterRefresh: true });
  });

  it('ne tente pas de renouveler après un échec de connexion', async () => {
    const error = { response: { status: 401, data: {} }, config: { url: '/auth/login' } };
    await expect(onError(error)).rejects.toBe(error);
    expect(clients.refresh.post).not.toHaveBeenCalled();
  });
});
