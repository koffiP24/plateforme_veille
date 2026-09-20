import { describe, expect, it } from 'vitest';
import { errorFr } from './errors';

describe('messages d’erreur français', () => {
  it('traduit les erreurs HTTP et de validation usuelles', () => {
    expect(errorFr('Forbidden')).toContain('droits nécessaires');
    expect(errorFr('email must be an email')).toContain('adresse électronique valide');
    expect(errorFr('Cannot POST /api/v1/test')).toContain('introuvable');
  });
});
