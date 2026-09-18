import axios from "axios";
import { errorFr } from '../i18n/errors';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const message = error.response?.data?.message;
    if (typeof message === 'string') {
      error.response.data.message = errorFr(message);
    } else if (Array.isArray(message)) {
      error.response.data.message = message.map((value: unknown) =>
        typeof value === 'string' ? errorFr(value) : value,
      ).join(' ');
    }
    if (typeof error.message === 'string') error.message = errorFr(error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");

      localStorage.removeItem("current_user");
    }

    return Promise.reject(error);
  },
);

export default api;
