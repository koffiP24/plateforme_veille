import { describe, expect, it } from 'vitest';
import { safeExternalUrl } from './safe-external-url';

describe('safeExternalUrl', () => {
  it('écarte les anciens liens dangereux sans casser les liens web', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html,hello')).toBeNull();
    expect(safeExternalUrl('https://example.org/article')).toBe('https://example.org/article');
  });
});
