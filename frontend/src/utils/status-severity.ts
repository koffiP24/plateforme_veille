export type StatusSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

const successStatuses = new Set([
  'ACTIVE', 'AVAILABLE', 'COMPLETED', 'SUCCESS', 'VALIDATED', 'VALIDE',
  'PUBLISHED', 'PUBLIE', 'GENERATED', 'SENT', 'DONE', 'UP',
]);
const infoStatuses = new Set(['NOUVEAU', 'NEW', 'RUNNING', 'IN_PROGRESS', 'RECEIVED', 'UPDATED']);
const warningStatuses = new Set(['A_QUALIFIER', 'TO_QUALIFY', 'A_VALIDER', 'PENDING', 'NOT_TESTED', 'OPEN', 'DEGRADED']);
const dangerStatuses = new Set(['REJETE', 'REJECTED', 'ERROR', 'FAILED', 'COMPLETED_WITH_ERRORS', 'DOWN']);

export function statusSeverity(status: string | null | undefined): StatusSeverity {
  if (!status) return 'secondary';
  if (successStatuses.has(status)) return 'success';
  if (infoStatuses.has(status)) return 'info';
  if (warningStatuses.has(status)) return 'warn';
  if (dangerStatuses.has(status)) return 'danger';
  return 'secondary';
}
