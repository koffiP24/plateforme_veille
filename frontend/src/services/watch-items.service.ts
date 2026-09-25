import api from "./api";

export interface WatchItem {
  id: number;

  title: string;

  summary: string | null;

  doi: string | null;

  url: string | null;

  collectedAt: string;

  publishedAt: string | null;

  watchType: string;

  status: string;

  relevance: number | null;

  criticality: string | null;

  source: {
    id: number;
    name: string;
    sourceType: string;
    category: string;
  };
}

export function getWatchItems() {
  return api.get<WatchItem[]>("/watch-items");
}

export function getWatchItem(id: number) {
  return api.get<WatchItem>(`/watch-items/${id}`);
}
