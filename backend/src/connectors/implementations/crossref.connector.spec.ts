import { CrossrefConnector } from './crossref.connector';
import { vi } from 'vitest';

describe('CrossrefConnector URL personnalisée', () => {
  it('conserve les filtres d’une URL Crossref et ajoute la recherche configurée', () => {
    const connector = new CrossrefConnector({
      baseUrl: 'https://api.crossref.org/works?filter=from-pub-date:2026-01-01',
      query: 'laboratory',
      rows: 10,
    });
    const url = new URL((connector as never as { buildUrl: () => string }).buildUrl());
    expect(url.pathname).toBe('/works');
    expect(url.searchParams.get('filter')).toBe('from-pub-date:2026-01-01');
    expect(url.searchParams.get('query')).toBe('laboratory');
    expect(url.searchParams.get('rows')).toBe('10');
  });

  it('accepte aussi une URL Crossref versionnée', () => {
    const connector = new CrossrefConnector({ baseUrl: 'https://api.crossref.org/v1/works?filter=type:journal-article' });
    const url = new URL((connector as never as { buildUrl: () => string }).buildUrl());
    expect(url.pathname).toBe('/v1/works');
    expect(url.searchParams.get('filter')).toBe('type:journal-article');
  });

  it('respecte la recherche et la taille précisées directement dans l’URL', () => {
    const connector = new CrossrefConnector({
      baseUrl: 'https://api.crossref.org/works?query.bibliographic=ISO%2017025&rows=25',
      query: 'principaux: accreditation\nseuil: 3',
    });
    const url = new URL((connector as never as { buildUrl: () => string }).buildUrl());
    expect(url.searchParams.get('query.bibliographic')).toBe('ISO 17025');
    expect(url.searchParams.get('query')).toBeNull();
    expect(url.searchParams.get('rows')).toBe('25');
  });
});

describe('CrossrefConnector : sujets séparés par des virgules', () => {
  it('interroge chaque sujet et fusionne les DOI reçus', async () => {
    const connector = new CrossrefConnector({
      baseUrl: 'https://api.crossref.org/works',
      query: 'environnement, ISO 17025, bonbon sucré salé',
    });
    const request = vi.spyOn(connector as never, 'request' as never)
      .mockImplementation(async (url: string) => ({
        text: async () => JSON.stringify({
          message: { items: [{ DOI: url.includes('iso+17025') ? '10.1/second' : '10.1/shared', title: ['Exemple'] }] },
        }),
      }) as never);
    const result = await connector.collect();
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls.map(([url]) => new URL(url as string).searchParams.get('query')))
      .toEqual(['environnement', 'iso 17025', 'bonbon sucre sale']);
    expect(result.items).toHaveLength(2);
  });
});
