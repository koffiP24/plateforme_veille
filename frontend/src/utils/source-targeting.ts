const DEFAULT_QUERIES: Record<string, string> = {
  SCIENTIFIQUE:
    "scientifique, research, study, laboratoire, laboratory, microbiologie, microbiology, analyse, analysis, méthode, method",

  REGLEMENTAIRE:
    "règlement, regulation, regulatory, directive, décret, loi, law, conformité, compliance",

  ACCREDITATION:
    "accréditation, accreditation, ISO 17025, ISO/IEC 17025, laboratoire, laboratory, essais, testing, étalonnage, calibration, compétence, competence",

  NORMATIF: "norme, standard, ISO, IEC, AFNOR, ASTM, BSI, normalisation",

  ENVIRONNEMENT:
    "environnement, environment, eau, water, pollution, pesticide, sol, soil, air, déchet, waste",

  AUTRE: "",
};

export function defaultSourceQuery(category: string): string {
  return DEFAULT_QUERIES[category] ?? "";
}
