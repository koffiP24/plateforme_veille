import { Injectable, Logger } from '@nestjs/common';
import { NormalizedWatchItem } from '../watch-items/interfaces/normalized-watch-item.interface';

type DeepLTranslation = { text: string; detected_source_language?: string };
type DeepLResponse = { translations?: DeepLTranslation[] };

@Injectable()
export class DeepLService {
  private readonly logger = new Logger(DeepLService.name);
  private warnedMissingKey = false;
  private unavailableUntil = 0;

  async translate(item: NormalizedWatchItem): Promise<NormalizedWatchItem> {
    if (/^fr(?:-|$)/i.test(item.language ?? '')) return item;
    if (Date.now() < this.unavailableUntil) return item;

    const apiKey = process.env.DEEPL_API_KEY?.trim();
    if (!apiKey) {
      if (!this.warnedMissingKey) {
        this.logger.warn('DEEPL_API_KEY absente : les nouvelles veilles restent dans leur langue d’origine.');
        this.warnedMissingKey = true;
      }
      return item;
    }

    const texts = [item.title, item.summary].filter((value): value is string => Boolean(value?.trim()));
    if (!texts.length) return item;

    // Les clés API Free utilisent api-free ; les autres clés utilisent api.deepl.com.
    const endpoint = apiKey.endsWith(':fx')
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: texts, target_lang: 'FR' }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        // Une clé invalide ou un quota épuisé ne doit pas provoquer un appel par élément.
        if (response.status === 403 || response.status === 456) {
          this.unavailableUntil = Number.POSITIVE_INFINITY;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as DeepLResponse;
      const translations = data.translations;
      if (!Array.isArray(translations) || translations.length !== texts.length ||
        translations.some((translation) => typeof translation?.text !== 'string')) {
        throw new Error('Réponse de traduction incomplète');
      }

      const originalLanguage = translations[0].detected_source_language?.toLowerCase();
      return {
        ...item,
        title: originalLanguage === 'fr' ? item.title : translations[0].text,
        summary: item.summary
          ? translations[1]?.detected_source_language?.toLowerCase() === 'fr'
            ? item.summary
            : translations[1]?.text ?? item.summary
          : null,
        language: originalLanguage ?? item.language,
        // L'empreinte originale reste stable pour reconnaître les doublons.
      };
    } catch (error) {
      if (this.unavailableUntil !== Number.POSITIVE_INFINITY) {
        this.unavailableUntil = Date.now() + 60_000;
      }
      this.logger.warn(`Traduction DeepL indisponible : ${error instanceof Error ? error.message : 'erreur inconnue'}`);
      return item;
    }
  }
}
