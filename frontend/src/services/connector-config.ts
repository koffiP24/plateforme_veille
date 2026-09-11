export function buildConnectorConfig(type: string, url: string, query = ''): Record<string, unknown> {
  if (type === 'IMPORT_MANUEL') return {};
  let parsed: URL;
  try { parsed = new URL(url.trim()); } catch { throw new Error('Renseignez une URL complète et valide pour le connecteur.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Utilisez une URL HTTP ou HTTPS sans identifiants.');
  }
  if (type === 'RSS' || type === 'ATOM') return { feedUrl: parsed.href };
  if (type === 'API') {
    if (parsed.origin !== 'https://api.crossref.org' || !['', '/'].includes(parsed.pathname) || parsed.search || parsed.hash) {
      throw new Error('Seule l’API Crossref est disponible : utilisez https://api.crossref.org.');
    }
    return { provider: 'CROSSREF', baseUrl: parsed.origin, query: query.trim(), rows: 10 };
  }
  throw new Error('Ce type de connecteur n’est pas encore disponible.');
}
