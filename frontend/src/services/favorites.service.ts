import api from "./api";
export const getFavorites = () => api.get("/favorites");
export const addFavorite = (id: number) => api.post(`/favorites/${id}`);
export const removeFavorite = (id: number) => api.delete(`/favorites/${id}`);
