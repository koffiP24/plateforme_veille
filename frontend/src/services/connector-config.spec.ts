import { describe, expect, it } from 'vitest';
import { buildConnectorConfig } from './connector-config';

describe('configuration des API de collecte', () => {
  it('conserve une URL de recherche Crossref avec ses filtres', () => {
    expect(buildConnectorConfig('API', 'https://api.crossref.org/v1/works?filter=from-pub-date:2026-01-01', 'laboratory'))
      .toMatchObject({ provider: 'CROSSREF', baseUrl: 'https://api.crossref.org/v1/works?filter=from-pub-date:2026-01-01', query: 'laboratory' });
  });

  it('accepte une autre API JSON publique', () => {
    expect(buildConnectorConfig('API', 'https://example.org/api/articles?limit=20', 'water'))
      .toEqual({ provider: 'JSON_FEED', feedUrl: 'https://example.org/api/articles?limit=20', query: 'water' });
  });
});
