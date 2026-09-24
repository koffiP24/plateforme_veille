export type PriorityLevel = 'FAIBLE' | 'MOYENNE' | 'ELEVEE' | 'CRITIQUE';

export function criticalityFromScore(score: number): PriorityLevel {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error('La priorité doit être un entier entre 0 et 100.');
  }

  if (score <= 25) return 'FAIBLE';

  if (score <= 50) return 'MOYENNE';

  if (score <= 75) return 'ELEVEE';

  return 'CRITIQUE';
}
