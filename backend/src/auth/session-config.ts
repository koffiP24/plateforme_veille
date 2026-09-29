export function jwtTtlSeconds(value: string | undefined, fallback: string): number {
  const duration = (value || fallback).trim();
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match || Number(match[1]) < 1) {
    throw new Error(`Durée JWT invalide : ${duration}. Utilisez par exemple 8h ou 7d.`);
  }
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
  const seconds = Number(match[1]) * multiplier;
  if (!Number.isSafeInteger(seconds)) throw new Error('Durée JWT trop grande.');
  return seconds;
}
