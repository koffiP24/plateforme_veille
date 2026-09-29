import { WatchItem } from '../watch-items/entities/watch-item.entity';

const TYPE_LABELS: Record<string, string> = {
  SCIENTIFIQUE: 'Scientifique',
  REGLEMENTAIRE: 'Réglementaire',
  ACCREDITATION: 'Accréditation',
  NORMATIF: 'Normatif',
  ENVIRONNEMENT: 'Environnement',
  AUTRE: 'Autre',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  RSS: 'Flux RSS',
  ATOM: 'Flux Atom',
  API: 'API',
  IMPORT_MANUEL: 'Import manuel',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!);
}

export function renderPublicationEmail(item: WatchItem, frontendUrl: string) {
  const baseUrl = new URL(frontendUrl);
  if (!['http:', 'https:'].includes(baseUrl.protocol)) {
    throw new Error('FRONTEND_URL doit être une adresse HTTP ou HTTPS.');
  }
  const link = new URL(`/watch-items/${item.id}`, baseUrl).toString();
  const title = item.title.replace(/[\r\n]+/g, ' ').trim();
  const type = TYPE_LABELS[item.watchType] ?? item.watchType ?? 'Non renseigné';
  const source = item.source?.name ?? 'Source non renseignée';
  const sourceType = item.source?.sourceType
    ? SOURCE_TYPE_LABELS[item.source.sourceType] ?? item.source.sourceType
    : 'Non renseigné';
  const summary = item.summary?.replace(/\s+/g, ' ').trim().slice(0, 420)
    || 'Aucun résumé disponible.';
  const subject = `[Veille] Nouvelle publication · ${title.slice(0, 120)}`;

  const text = [
    'Nouvelle veille publiée',
    '',
    title,
    `Type de veille : ${type}`,
    `Source : ${source}`,
    `Type de source : ${sourceType}`,
    '',
    summary,
    '',
    `Voir la veille : ${link}`,
    '',
    'Vous recevez ce message car vous suivez un élément lié à cette veille.',
  ].join('\n');

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#edf3f8;color:#14243b;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #dce7ee;border-radius:12px">
<tr><td style="padding:24px 28px;background:#10243a;color:#fff;border-radius:12px 12px 0 0">
<div style="font-size:13px;letter-spacing:2px;color:#55dfb5">VEILLE</div>
<h1 style="margin:10px 0 0;font-size:23px">Nouvelle veille publiée</h1></td></tr>
<tr><td style="padding:28px">
<h2 style="margin:0 0 18px;font-size:21px;line-height:1.4">${escapeHtml(title)}</h2>
<p style="margin:0 0 16px;font-size:14px"><strong>Type de veille :</strong> ${escapeHtml(type)}<br><strong>Source :</strong> ${escapeHtml(source)}<br><strong>Type de source :</strong> ${escapeHtml(sourceType)}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#40536a">${escapeHtml(summary)}</p>
<a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#22c998;color:#082137;text-decoration:none;font-weight:bold">Voir la veille</a>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e7edf2;color:#64758b;font-size:12px">
Vous recevez ce message car vous suivez un élément lié à cette veille.</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, text, html };
}
