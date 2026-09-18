import api from './api';

export type DashboardStats = Record<string, number>;

export function getDashboard() {
  return api.get<DashboardStats>('/dashboard');
}
