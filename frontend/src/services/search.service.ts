import api from "./api";
export interface SearchParams {
  q?: string;
  status?: string;
  criticality?: string;
  watchType?: string;
  sourceId?: number;
  domainId?: number;
  laboratoryId?: number;
  favoritesOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}
export function searchWatchItems(params: SearchParams, signal?: AbortSignal) {
  return api.get("/search/watch-items", {
    params: {
      ...params,
      favoritesOnly: params.favoritesOnly ? true : undefined,
    },
    signal,
  });
}
