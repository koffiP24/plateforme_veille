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
  CREATED: 'Créé', UPDATED: 'Mis à jour', DUPLICATE: 'Doublon', RECEIVED: 'Reçu',
  SUCCESS: 'Réussi', FAILED: 'Échoué', PENDING: 'En attente',
  VALIDATED: 'Validé', PUBLISHED: 'Publié', REJECTED: 'Rejeté', ARCHIVED: 'Archivé',
  TO_QUALIFY: 'À qualifier', NEW: 'Nouveau',
  HUMAN: 'Manuel', AUTOMATIC: 'Automatique',
  OPEN: 'À faire', IN_PROGRESS: 'En cours', DONE: 'Terminée', CANCELLED: 'Annulée',
  ANALYSE_IMPACT: 'Analyse d’impact', MISE_A_JOUR_METHODE: 'Mise à jour de méthode',
  FORMATION: 'Formation', VERIFICATION: 'Vérification',
  VALIDATE: 'Valider', REJECT: 'Rejeter',
  WEEKLY: 'Hebdomadaire', MONTHLY: 'Mensuel', CUSTOM: 'Personnalisé',
  IN_APP: 'Dans l’application', EMAIL: 'Courriel',
  SOURCE: 'Source', DOMAIN: 'Domaine', TOPIC: 'Thème', KEYWORD: 'Mot-clé',
  GENERATED: 'Généré', SENT: 'Envoyée',
  UP: 'Opérationnelle', DOWN: 'Indisponible', DEGRADED: 'Dégradée',
};
export function labelFr(value: string | null | undefined): string {
  return value ? labels[value] ?? value : 'Non renseigné';
}
export function optionsFr(values: string[]) {
  return values.map(value => ({ label: labelFr(value), value }));
}
