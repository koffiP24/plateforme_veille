import { describe, expect, it } from 'vitest';

import { RssConnector } from './rss.connector';

describe('RssConnector formats JSON et CSV', () => {
  it('détecte le format avec le type HTTP, l’extension ou le contenu', () => {
    const connector = new RssConnector({ feedUrl: 'https://example.org/feed' });
    const detect = (content: string, url: string, contentType?: string) =>
      (connector as unknown as {
        detectFormat(value: string, parsedUrl: URL, mediaType?: string): string;
      }).detectFormat(content, new URL(url), contentType);

    expect(detect('<rss></rss>', 'https://example.org/feed')).toBe('XML');
    expect(detect('', 'https://example.org/feed.json')).toBe('JSON');
    expect(detect('title,description\nTest,Résumé', 'https://example.org/feed')).toBe('CSV');
    expect(detect('[]', 'https://example.org/feed', 'application/json')).toBe('JSON');
  });

  it('convertit un flux JSON Feed en éléments collectables', () => {
    const connector = new RssConnector({ feedUrl: 'https://example.org/feed.json' });
    const items = (connector as unknown as { parseJson(value: string): Array<Record<string, unknown>> })
      .parseJson(JSON.stringify({ items: [{
        id: 'article-1', title: 'Nouvelle norme', content_text: 'Résumé',
        url: 'https://example.org/article-1', date_published: '2026-09-22T10:00:00Z',
      }] }));

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      externalId: 'article-1', title: 'Nouvelle norme', summary: 'Résumé',
      url: 'https://example.org/article-1',
    });
    expect(items[0].publishedAt).toEqual(new Date('2026-09-22T10:00:00Z'));
  });

  it('convertit un flux CSV avec virgules protégées par des guillemets', () => {
    const connector = new RssConnector({ feedUrl: 'https://example.org/feed.csv' });
    const items = (connector as unknown as { parseCsv(value: string): Array<Record<string, unknown>> })
      .parseCsv('Title,Description,Link,Published Date\r\n"Alerte, laboratoire","Un résumé","https://example.org/a","2026-09-22"');

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Alerte, laboratoire', summary: 'Un résumé', url: 'https://example.org/a',
    });
    expect(items[0].publishedAt).toEqual(new Date('2026-09-22'));
  });
});
