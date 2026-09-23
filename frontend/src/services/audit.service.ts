import api from './api';

export function getAuditLogs() {
  return api.get('/audit', {
    params: { actualisation: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });
}
