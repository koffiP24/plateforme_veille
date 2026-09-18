import api from "./api";

export interface Review {
  id: number;
  status: string;
  relevance: number | null;
  criticality: string | null;
  comment: string | null;
  reviewedAt: string;
  reviewer: {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export function reviewWatchItem(
  id: number,
  payload: {
    decision: "VALIDATE" | "REJECT";
    relevance?: number;
    criticality?: string;
    comment?: string;
  },
) {
  return api.post(`/watch-items/${id}/review`, payload);
}
export function publishWatchItem(id: number, comment?: string) {
  return api.post(`/watch-items/${id}/publish`, { comment });
}
export function archiveWatchItem(id: number, comment?: string) {
  return api.post(`/watch-items/${id}/archive`, { comment });
}
export function getReviews(id: number) {
  return api.get<Review[]>(`/watch-items/${id}/reviews`);
}
