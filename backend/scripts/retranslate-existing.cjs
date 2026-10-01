/* Retranslate stored watch items without changing source fingerprints. */
const path = require('node:path');
const fs = require('node:fs');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const mode = process.argv[2];
if (!['--check', '--apply'].includes(mode)) {
  console.error('Usage: node scripts/retranslate-existing.cjs --check|--apply --ids 85,86');
  process.exit(2);
}
const idsIndex = process.argv.indexOf('--ids');
const idList = idsIndex >= 0 ? process.argv[idsIndex + 1] : '';
const ids = idList.split(',').map((value) => Number(value.trim()));
if (!idList || ids.some((id) => !Number.isSafeInteger(id) || id < 1)) {
  console.error('Indiquer les identifiants des veilles vérifiées : --ids 85,86');
  process.exit(2);
}
const sourceLanguageIndex = process.argv.indexOf('--source-lang');
const sourceLanguage = sourceLanguageIndex >= 0 ? process.argv[sourceLanguageIndex + 1]?.toUpperCase() : null;
if (sourceLanguage && !/^[A-Z]{2}$/.test(sourceLanguage)) {
  console.error('La langue source doit être un code à deux lettres, par exemple EN.');
  process.exit(2);
}

const apiKey = process.env.DEEPL_API_KEY?.trim();
if (!apiKey) {
  console.error('DEEPL_API_KEY est absente dans backend/.env.');
  process.exit(2);
}

const endpoint = apiKey.endsWith(':fx')
  ? 'https://api-free.deepl.com/v2/translate'
  : 'https://api.deepl.com/v2/translate';

async function translate(texts) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texts, target_lang: 'FR', ...(sourceLanguage ? { source_lang: sourceLanguage } : {}) }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`DeepL HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.translations) || data.translations.length !== texts.length) {
    throw new Error('Réponse DeepL incomplète.');
  }
  return data.translations;
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, title, language FROM watch_items WHERE id = ANY($1::int[]) ORDER BY id',
      [ids],
    );
    if (rows.length !== new Set(ids).size) throw new Error('Un ou plusieurs identifiants sont introuvables.');
    if (!rows.length) {
      console.log('Aucune veille à retraduire.');
      return;
    }
    if (mode === '--check') {
      const [result] = await translate([rows[0].title]);
      console.log(`DeepL opérationnel. Langue détectée : ${result.detected_source_language ?? 'inconnue'}.`);
      console.log(`Exemple : ${result.text}`);
      console.log(`${rows.length} veilles existantes ; aucune donnée modifiée.`);
      return;
    }

    const translated = [];
    for (let offset = 0; offset < rows.length; offset += 40) {
      const chunk = rows.slice(offset, offset + 40);
      translated.push(...await translate(chunk.map(({ title }) => title)));
    }
    const updates = new Map(rows.map((row) => [row.id, { ...row }]));
    rows.forEach(({ id }, index) => {
      const result = translated[index];
      if (typeof result?.text !== 'string') throw new Error('Traduction manquante.');
      const row = updates.get(id);
      if (result.detected_source_language?.toLowerCase() !== 'fr') row.title = result.text;
      if (result.detected_source_language) {
        row.language = result.detected_source_language.toLowerCase();
      }
    });

    const changed = rows.filter((original) => {
      const updated = updates.get(original.id);
      return updated.title !== original.title;
    });
    if (!changed.length) {
      console.log('Tous les titres sélectionnés sont déjà en français.');
      return;
    }
    const backupPath = path.resolve(
      __dirname,
      `../../../tmp/retranslation-watch-items-backup-${ids.join('-')}.json`,
    );
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.writeFileSync(backupPath, JSON.stringify(changed, null, 2), { flag: 'w' });

    await client.query('BEGIN');
    try {
      for (const original of changed) {
        const updated = updates.get(original.id);
        const result = await client.query(
          'UPDATE watch_items SET title = $1, language = $2, updated_at = NOW() WHERE id = $3 AND title = $4',
          [updated.title, updated.language, original.id, original.title],
        );
        if (result.rowCount !== 1) throw new Error(`La veille ${original.id} a changé pendant la retraduction.`);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log(`${changed.length} veille(s) retraduite(s) sur ${rows.length}. Empreintes et versions conservées.`);
    console.log(`Sauvegarde des anciens textes : ${backupPath}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
