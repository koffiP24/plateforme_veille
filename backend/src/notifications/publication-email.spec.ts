import { renderPublicationEmail } from './publication-email';

describe('alerte immédiate par e-mail', () => {
  it('affiche le type de veille, la source et le lien local', () => {
    const message = renderPublicationEmail({
      id: 42,
      title: 'Nouveau guide ISO 17025',
      watchType: 'ACCREDITATION',
      summary: 'Résumé du guide.',
      source: { name: 'COFRAC', sourceType: 'RSS' },
    } as never, 'http://localhost:5173');
    expect(message.subject).toContain('Nouveau guide ISO 17025');
    expect(message.text).toContain('Type de veille : Accréditation');
    expect(message.text).toContain('Source : COFRAC');
    expect(message.text).toContain('Type de source : Flux RSS');
    expect(message.text).toContain('http://localhost:5173/watch-items/42');
    expect(message.html).toContain('Voir la veille');
  });

  it('échappe le contenu affiché dans le HTML', () => {
    const message = renderPublicationEmail({
      id: 1,
      title: '<script>alerte</script>',
      watchType: 'AUTRE',
      summary: 'Texte <b>brut</b>',
      source: { name: 'A&B' },
    } as never, 'http://localhost:5173');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.html).toContain('A&amp;B');
    expect(message.html).not.toContain('<script>');
  });
});
