const DEFAULT_QUERIES: Record<string, string> = {
  SCIENTIFIQUE: 'scientifique, scientific, recherche, research, étude, study, laboratoire, laboratory, microbiologie, microbiology, analyse, analysis',
  REGLEMENTAIRE: 'règlement, regulation, regulatory, directive, décret, loi, law, conformité, compliance, législation, legislation',
  ACCREDITATION: 'ISO 17025, ISO/IEC 17025, accréditation, accreditation, laboratoire, laboratory, essais, testing, étalonnage, calibration',
  NORMATIF: 'norme, standard, ISO, IEC, AFNOR, ASTM, BSI, normalisation, standardization, conformité, compliance',
  ENVIRONNEMENT: 'environnement, environment, pollution, eau, water, pesticide, sol, soil, air, déchet, waste',
  AUTRE: '',
};

export function defaultSourceQuery(category: string): string {
  return DEFAULT_QUERIES[category] ?? '';
}

export function simpleSourceQuery(query: string): string {
  const lines = query.split(/\r?\n/);
  if (!lines.some((line) => /^\s*(principaux?|primary|secondaires?|secondary)\s*:/i.test(line))) {
    return query;
  }
  return lines
    .filter((line) => /^\s*(principaux?|primary|secondaires?|secondary)\s*:/i.test(line))
    .map((line) => line.replace(/^\s*[^:]+:\s*/, ''))
    .join(', ')
    .replace(/"/g, '');
}
