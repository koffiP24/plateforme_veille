import { describe, expect, it } from 'vitest';
import { labelFr, optionsFr } from './labels';

describe('libellés français', () => {
  it('traduit les statuts techniques affichés dans l’interface', () => {
    expect(labelFr('AVAILABLE')).toBe('Disponible');
    expect(labelFr('IN_PROGRESS')).toBe('En cours');
    expect(labelFr('PUBLIE')).toBe('Publié');
  });

  it('conserve une valeur inconnue et construit les options', () => {
    expect(labelFr('VALEUR_INCONNUE')).toBe('VALEUR_INCONNUE');
    expect(optionsFr(['ACTIVE'])).toEqual([{ label: 'Actif', value: 'ACTIVE' }]);
  });
});
