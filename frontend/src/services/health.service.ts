import api from './api';

export function getHealth() {
  return api.get('/health');
}

export function retryConnector(id: number) {
  return api.post(`/connectors/${id}/retry`);
}
