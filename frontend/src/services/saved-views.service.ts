import api from "./api";
export const getSavedViews = () => api.get("/saved-views");
export const createSavedView = (payload: {
  name: string;
  filters: Record<string, unknown>;
}) => api.post("/saved-views", payload);
export const deleteSavedView = (id: number) => api.delete(`/saved-views/${id}`);
