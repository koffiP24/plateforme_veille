import { NormalizationService } from './normalization.service';
import type { Source } from '../sources/entities/source.entity';

describe('NormalizationService - liens externes', () => {
  const source = { id: 1, category: 'SCIENTIFIQUE' } as Source;
  const service = new NormalizationService();

  it('écarte les URL actives non HTTP provenant des flux', () => {
    const item = service.normalize(source, { title: 'Article', url: 'javascript:alert(1)' });
    expect(item.url).toBeNull();
    expect(item.canonicalUrl).toBeNull();
  });

  it('conserve une URL HTTPS normale', () => {
    const item = service.normalize(source, { title: 'Article', url: 'https://example.org/article' });
    expect(item.url).toBe('https://example.org/article');
  });
});
