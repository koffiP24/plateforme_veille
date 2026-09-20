import axios from "axios";
import { errorFr } from '../i18n/errors';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1",
  withCredentials: true,
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
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    return Promise.reject(error);
  },
);

export default api;
