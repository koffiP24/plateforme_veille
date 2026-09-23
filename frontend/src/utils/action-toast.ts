import { isAxiosError } from 'axios';

interface ToastMessage {
  severity: 'success' | 'error' | 'warn' | 'info';
  summary: string;
  detail: string;
  life: number;
}

interface ToastLike {
  add(message: ToastMessage): void;
}

export function apiErrorMessage(error: unknown, fallback: string) {
  const message = isAxiosError(error) ? error.response?.data?.message : undefined;
  if (Array.isArray(message)) return message.join(' ');
  return typeof message === 'string' && message.trim() ? message : fallback;
}

export function actionSuccess(toast: ToastLike, summary: string, detail: string) {
  toast.add({ severity: 'success', summary, detail, life: 4500 });
}

export function actionError(toast: ToastLike, error: unknown, summary: string, fallback: string) {
  const detail = apiErrorMessage(error, fallback);
  toast.add({ severity: 'error', summary, detail, life: 6500 });
  return detail;
}
