import { LibreTranslateService } from './libretranslate.service';

describe('LibreTranslateService', () => {
  const item = { title: 'Environmental standards', summary: 'New water rules', language: null, fingerprint: 'original' };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('détecte la langue, traduit en français et conserve l’empreinte originale', async () => {
    vi.stubEnv('LIBRETRANSLATE_URL', 'http://127.0.0.1:5000');
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translatedText: ['Normes environnementales', 'Nouvelles règles sur l’eau'], detectedLanguage: [{ language: 'en', confidence: 100 }] }),
    });
    vi.stubGlobal('fetch', request);

    const translated = await new LibreTranslateService().translate(item as never);
    expect(translated).toMatchObject({ title: 'Normes environnementales', summary: 'Nouvelles règles sur l’eau', language: 'en', fingerprint: 'original' });
    expect(request).toHaveBeenCalledWith(new URL('http://127.0.0.1:5000/translate'), expect.objectContaining({
      body: JSON.stringify({ q: [item.title, item.summary], source: 'auto', target: 'fr', format: 'text' }),
    }));
  });

  it('conserve une veille détectée comme française', async () => {
    vi.stubEnv('LIBRETRANSLATE_URL', 'http://127.0.0.1:5000');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translatedText: ['Autre titre', 'Autre résumé'], detectedLanguage: { language: 'fr', confidence: 100 } }),
    }));
    await expect(new LibreTranslateService().translate(item as never)).resolves.toMatchObject({ title: item.title, summary: item.summary, language: 'fr' });
  });

  it('évite tout appel pour une langue déjà connue comme française', async () => {
    vi.stubEnv('LIBRETRANSLATE_URL', 'http://127.0.0.1:5000');
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    await expect(new LibreTranslateService().translate({ ...item, language: 'fr-FR' } as never)).resolves.toMatchObject({ title: item.title });
    expect(request).not.toHaveBeenCalled();
  });

  it('évite de répéter une requête en échec pour chaque élément de la collecte', async () => {
    vi.stubEnv('LIBRETRANSLATE_URL', 'http://127.0.0.1:5000');
    const request = vi.fn().mockRejectedValue(new Error('Service arrêté'));
    vi.stubGlobal('fetch', request);
    const service = new LibreTranslateService();
    await service.translate(item as never);
    await service.translate(item as never);
    expect(request).toHaveBeenCalledOnce();
  });
});
