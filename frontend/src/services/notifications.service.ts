import api from "./api";
export const getNotifications = () => api.get("/notifications");
export const markNotificationRead = (id: number) =>
  api.patch(`/notifications/${id}/read`);
