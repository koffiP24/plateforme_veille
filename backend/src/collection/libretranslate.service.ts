import { Injectable, Logger } from '@nestjs/common';
import { NormalizedWatchItem } from '../watch-items/interfaces/normalized-watch-item.interface';

type DetectedLanguage = { language: string; confidence?: number };
type TranslateResponse = {
  translatedText: string | string[];
  detectedLanguage?: DetectedLanguage | DetectedLanguage[];
};

@Injectable()
export class LibreTranslateService {
  private readonly logger = new Logger(LibreTranslateService.name);
  private warnedMissingUrl = false;
  private unavailableUntil = 0;

  async translate(item: NormalizedWatchItem): Promise<NormalizedWatchItem> {
    if (/^fr(?:-|$)/i.test(item.language ?? '')) return item;
    if (Date.now() < this.unavailableUntil) return item;

    const configuredUrl = process.env.LIBRETRANSLATE_URL?.trim();
    if (!configuredUrl) {
      if (!this.warnedMissingUrl) {
        this.logger.warn('LIBRETRANSLATE_URL absente : les nouvelles veilles restent dans leur langue d’origine.');
        this.warnedMissingUrl = true;
      }
      return item;
    }

    let endpoint: URL;
    try {
      endpoint = new URL(configuredUrl.replace(/\/+$/, '') + '/translate');
      if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.hash) {
        throw new Error('Adresse invalide');
      }
    } catch {
      this.logger.error('LIBRETRANSLATE_URL doit être une URL HTTP ou HTTPS valide.');
      return item;
    }

    const texts = [item.title, item.summary].filter((value): value is string => Boolean(value?.trim()));
    if (!texts.length) return item;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: texts,
          source: 'auto',
          target: 'fr',
          format: 'text',
          ...(process.env.LIBRETRANSLATE_API_KEY?.trim()
            ? { api_key: process.env.LIBRETRANSLATE_API_KEY.trim() }
            : {}),
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as TranslateResponse;
      const translations = Array.isArray(data.translatedText) ? data.translatedText : [data.translatedText];
      if (translations.length !== texts.length || translations.some((text) => typeof text !== 'string')) {
        throw new Error('Réponse de traduction incomplète');
      }
      const detectedLanguage = data.detectedLanguage;
      const detectedLanguages = Array.isArray(detectedLanguage)
        ? detectedLanguage.map((language) => language?.language)
        : texts.map(() => detectedLanguage?.language);
      const detected = detectedLanguages[0];

      return {
        ...item,
        title: detected?.toLowerCase() === 'fr' ? item.title : translations[0],
        summary: item.summary
          ? detectedLanguages[1]?.toLowerCase() === 'fr' ? item.summary : translations[1] ?? item.summary
          : null,
        language: detected ?? item.language,
        // L'empreinte originale reste stable pour reconnaître les doublons aux prochaines collectes.
      };
    } catch (error) {
      // Une instance indisponible ne doit pas bloquer chaque élément de la même collecte.
      this.unavailableUntil = Date.now() + 60_000;
      this.logger.warn(`Traduction LibreTranslate indisponible : ${error instanceof Error ? error.message : 'erreur inconnue'}`);
      return item;
    }
  }
}
