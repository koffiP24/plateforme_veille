export function clampInteger(
  value: number | null | undefined,
  minimum: number,
  maximum: number,
) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}
