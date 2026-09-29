import { ConnectorsService } from './connectors.service';
import { RssConnector } from './implementations/rss.connector';

describe('ConnectorsService test du connecteur', () => {
  it('vérifie le connecteur sans lancer la collecte', async () => {
    const connector = { id: 4, connectorType: 'RSS', config: {}, status: 'NOT_TESTED' };
    const repository = {
      findOne: vi.fn().mockResolvedValue(connector),
      save: vi.fn(async (value) => value),
    };
    const service = new ConnectorsService(repository as never, {} as never);
    const implementation = {
      testConnection: vi.fn().mockResolvedValue({ success: true, message: 'Accessible' }),
      collect: vi.fn(),
    };
    vi.spyOn(service as never, 'buildImplementation').mockReturnValue(implementation as never);

    await expect(service.testConnection(4)).resolves.toMatchObject({ success: true });
    expect(implementation.testConnection).toHaveBeenCalledOnce();
    expect(implementation.collect).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'AVAILABLE' }));
  });

  it('utilise le lecteur de listes JSON pour une API autre que Crossref', () => {
    const service = new ConnectorsService({} as never, {} as never);
    const implementation = (service as never as { buildImplementation: (connector: unknown) => unknown })
      .buildImplementation({ connectorType: 'API', config: { provider: 'JSON_FEED', feedUrl: 'https://example.org/api/articles' } });
    expect(implementation).toBeInstanceOf(RssConnector);
  });
});
