export const WATCH_STATUS = {
  NEW: 'NOUVEAU',
  TO_QUALIFY: 'A_QUALIFIER',
  VALIDATED: 'VALIDE',
  PUBLISHED: 'PUBLIE',
  ARCHIVED: 'ARCHIVE',
  REJECTED: 'REJETE',
} as const;

export type WatchStatus = (typeof WATCH_STATUS)[keyof typeof WATCH_STATUS];
