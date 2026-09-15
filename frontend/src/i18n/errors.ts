const messages: Record<string, string> = {
  'Unauthorized': 'Connexion requise ou session expirée.',
  'Forbidden': 'Vous ne disposez pas des droits nécessaires.',
  'Forbidden resource': 'Vous ne disposez pas des droits nécessaires.',
  'Not Found': 'Élément introuvable.',
  'Bad Request': 'Les données saisies sont invalides.',
  'Internal server error': 'Une erreur est survenue sur le serveur.',
  'Network Error': 'Impossible de joindre le serveur.',
};
const fields: Record<string, string> = {
  email: 'Adresse électronique', password: 'Mot de passe', firstName: 'Prénom', lastName: 'Nom',
  name: 'Nom', label: 'Libellé', description: 'Description', roles: 'Rôles', status: 'Statut',
  relevance: 'Pertinence', criticality: 'Criticité', watchType: 'Type de veille',
  topicIds: 'Thèmes', keywordIds: 'Mots-clés', domainIds: 'Domaines', laboratoryIds: 'Laboratoires',
  baseUrl: 'Adresse de la source', sourceType: 'Type de source', frequency: 'Fréquence',
  organization: 'Organisme', country: 'Pays', category: 'Catégorie', active: 'Activation',
  parentId: 'Thème parent', keywordId: 'Mot-clé', weight: 'Poids',
};

export function errorFr(message: string): string {
  if (messages[message]) return messages[message];
  if (/^Cannot (GET|POST|PATCH|PUT|DELETE) /.test(message)) return 'Cette opération est introuvable sur le serveur.';
  const match = message.match(/^(?:each value in )?(\w+) (must .+|should not be empty|should not exist)$/);
  if (!match) return message;
  const field = fields[match[1]!] ?? 'Champ';
  const rule = match[2]!;
  if (rule === 'must be an email') return `${field} : saisissez une adresse électronique valide.`;
  if (/must be (a|an) URL/.test(rule)) return `${field} : saisissez une adresse complète valide.`;
  if (rule.includes('longer than or equal to')) return `${field} : au moins ${rule.match(/\d+/)?.[0]} caractères sont nécessaires.`;
  if (rule.includes('shorter than or equal to')) return `${field} : ne dépassez pas ${rule.match(/\d+/)?.[0]} caractères.`;
  if (rule === 'should not be empty') return `${field} : ce champ est obligatoire.`;
  return `${field} : vérifiez la valeur saisie.`;
}
