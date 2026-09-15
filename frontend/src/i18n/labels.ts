const labels: Record<string, string> = {
  ADMIN: 'Administrateur', RESPONSABLE_VEILLE: 'Responsable de veille',
  OPERATEUR_VEILLE: 'Opérateur de veille', REFERENT_LABORATOIRE: 'Référent de laboratoire', LECTEUR: 'Lecteur',
  ACTIVE: 'Actif', INACTIVE: 'Inactif', SUSPENDED: 'Suspendu',
  NOUVEAU: 'Nouveau', A_QUALIFIER: 'À qualifier', QUALIFIE: 'Qualifié',
  A_VALIDER: 'À valider', VALIDE: 'Validé', REJETE: 'Rejeté', PUBLIE: 'Publié', ARCHIVE: 'Archivé',
  SCIENTIFIQUE: 'Scientifique', REGLEMENTAIRE: 'Réglementaire', ACCREDITATION: 'Accréditation',
  NORMATIF: 'Normatif', ENVIRONNEMENT: 'Environnement', AUTRE: 'Autre',
  IMPORT_MANUEL: 'Import manuel', API: 'Interface de données (API)', RSS: 'Flux RSS', ATOM: 'Flux Atom',
  FAIBLE: 'Faible', MOYENNE: 'Moyenne', ELEVEE: 'Élevée', CRITIQUE: 'Critique',
  NOT_TESTED: 'Non testé', AVAILABLE: 'Disponible', RUNNING: 'En cours',
  COMPLETED: 'Terminé', COMPLETED_WITH_ERRORS: 'Terminé avec erreurs', ERROR: 'En erreur',
  HUMAN: 'Manuel', AUTOMATIC: 'Automatique',
};
export function labelFr(value: string | null | undefined): string {
  return value ? labels[value] ?? value : 'Non renseigné';
}
export function optionsFr(values: string[]) {
  return values.map(value => ({ label: labelFr(value), value }));
}
