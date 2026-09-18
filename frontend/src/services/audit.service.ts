import api from './api';

export function getAuditLogs() {
  return api.get('/audit');
}
