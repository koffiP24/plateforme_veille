import api from "./api";

export interface Source {
  id: number;
  name: string;
  organization: string | null;
  country: string | null;
  category: string;
  sourceType: string;
  baseUrl: string | null;
  frequency: string | null;
  active: boolean;
  connectors?: {
    id: number;
    connectorType: string;
    status: string;
  }[];
}

export interface CreateSourcePayload {
  name: string;
  organization?: string;
  country?: string;
  category: string;
  sourceType: string;
  baseUrl?: string;
  frequency?: string;
  active?: boolean;
}

export function getSources() {
  return api.get<Source[]>("/sources");
}

export function createSource(payload: CreateSourcePayload) {
  return api.post("/sources", payload);
}

export function disableSource(id: number) {
  return updateSourceStatus(id, false);
}

export function updateSourceStatus(id: number, active: boolean) {
  return api.patch<Source>(`/sources/${id}/status`, { active });
}

export function testConnector(connectorId: number) {
  return api.post<{ success: boolean; message: string }>(
    `/connectors/${connectorId}/test`,
  );
}

export function runConnector(connectorId: number) {
  return api.post<{ count: number }>(`/connectors/${connectorId}/run`);
}
