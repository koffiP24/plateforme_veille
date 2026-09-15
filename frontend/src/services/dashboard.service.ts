import api from './api';
export type DashboardSummary = { access: 'welcome' } | {
  access: 'qualification';
  counts: { total: number; newItems: number; toQualify: number; qualificationFilled: number; highCriticality: number };
  recentItems: { id: number; title: string; sourceName: string; watchType: string; status: string; collectedAt: string }[];
  administration?: { activeSources: number; activeUsers: number; failedRuns: number };
};
export function getDashboard() { return api.get<DashboardSummary>('/dashboard'); }
