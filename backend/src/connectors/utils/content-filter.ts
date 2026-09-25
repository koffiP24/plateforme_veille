import { ExternalItem } from '../interfaces/connector.interface';

const CATEGORY_QUERIES: Record<string, string[]> = {
  SCIENTIFIQUE: [
    'scientifique',
    'science',
    'research',
    'study',
    'laboratoire',
    'laboratory',
    'microbiologie',
    'microbiology',
    'analyse',
    'analysis',
    'méthode',
    'method',
  ],

  REGLEMENTAIRE: [
    'règlement',
    'reglement',
    'regulation',
    'regulatory',
    'directive',
    'décret',
    'decret',
    'loi',
    'law',
    'conformité',
    'compliance',
  ],

  ACCREDITATION: [
    'accréditation',
    'accreditation',
    'ISO 17025',
    'ISO/IEC 17025',
    'laboratoire',
    'laboratory',
    'essais',
    'testing',
    'étalonnage',
    'calibration',
    'compétence',
    'competence',
  ],

  NORMATIF: [
    'norme',
    'standard',
    'ISO',
    'IEC',
    'AFNOR',
    'ASTM',
    'BSI',
    'normalisation',
    'standardization',
  ],

  ENVIRONNEMENT: [
    'environnement',
    'environment',
    'eau',
    'water',
    'pollution',
    'pesticide',
    'sol',
    'soil',
    'air',
    'déchet',
    'waste',
  ],

  AUTRE: [],
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function defaultQueryForCategory(category: string): string {
  return (CATEGORY_QUERIES[category] ?? []).join(', ');
}

function queryExpressions(query: string): string[] {
  return query
    .split(/[,;\n]+/)
    .map((term) => normalize(term))
    .filter(Boolean);
}

export function filterItemsByQuery(
  items: ExternalItem[],
  query: string,
): {
  items: ExternalItem[];
  ignoredCount: number;
} {
  const expressions = queryExpressions(query);

  if (!expressions.length) {
    return {
      items,
      ignoredCount: 0,
    };
  }

  const retained = items.filter((item) => {
    const searchable = normalize(`${item.title ?? ''} ${item.summary ?? ''}`);

    return expressions.some((expression) => searchable.includes(expression));
  });

  return {
    items: retained,
    ignoredCount: items.length - retained.length,
  };
}
