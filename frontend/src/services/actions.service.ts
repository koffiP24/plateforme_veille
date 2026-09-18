import api from "./api";

export interface FollowUpAction {
  id: number;
  title: string;
  description: string | null;
  actionType: string;
  impact: string | null;
  decision: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
  owner: { id: number; firstName?: string; lastName?: string; email: string };
  watchItem?: { id: number; title: string };
}

export function getActions(itemId: number) {
  return api.get<FollowUpAction[]>(`/watch-items/${itemId}/actions`);
}
export function getAllActions() {
  return api.get<FollowUpAction[]>("/actions");
}
export function createAction(
  itemId: number,
  payload: {
    title: string;
    description?: string;
    actionType: string;
    impact?: string;
    dueDate?: string;
    ownerId: number;
  },
) {
  return api.post(`/watch-items/${itemId}/actions`, payload);
}
export function updateAction(
  id: number,
  payload: {
    status?: string;
    impact?: string;
    decision?: string;
    dueDate?: string;
  },
) {
  return api.patch(`/actions/${id}`, payload);
}
