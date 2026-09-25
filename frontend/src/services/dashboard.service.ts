import api from './api';

export type DashboardStats = Record<string, number>;

export type DashboardSeries = { key: string; label: string; color: string };
export type DashboardPoint = { date: string; [key: string]: string | number };
export type DashboardDistributionItem = { label: string; value: number };
export type DashboardAnalytics = {
  days: number;
  timeline: { title: string; series: DashboardSeries[]; points: DashboardPoint[] };
  distributions: Record<string, { title: string; items: DashboardDistributionItem[] }>;
  topSources: DashboardDistributionItem[];
  urgentItems: Array<{ id: number; title: string; status: string; criticality: string; sourceName: string }>;
  dueActions: Array<{ id: number; title: string; status: string; dueDate: string | null; watchItemTitle: string }>;
};

export function getDashboard(days: number) {
  return api.get<DashboardStats>('/dashboard', { params: { days } });
}

export function getDashboardAnalytics(days: number) {
  return api.get<DashboardAnalytics>('/dashboard/analytics', { params: { days } });
}
