import api from "./api";
export const getSubscriptions = () => api.get("/subscriptions");
export const getSubscriptionOptions = () => api.get("/subscriptions/options");
export const createSubscription = (p: any) => api.post("/subscriptions", p);
export const deleteSubscription = (id: number) =>
  api.delete(`/subscriptions/${id}`);
