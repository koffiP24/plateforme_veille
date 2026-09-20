import { defineStore } from "pinia";
import { computed, ref } from "vue";

import api from "../services/api";

export interface CurrentUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<CurrentUser | null>(null);
  const initialized = ref(false);

  const isAuthenticated = computed(
    () => Boolean(user.value),
  );

  const isAdmin = computed(() => user.value?.roles.includes("ADMIN"));

  async function login(email: string, password: string) {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    user.value = response.data.user;
    initialized.value = true;
  }

  async function restoreSession() {
    if (initialized.value) return isAuthenticated.value;
    try {
      user.value = (await api.get<CurrentUser>("/auth/me")).data;
    } catch {
      user.value = null;
    } finally {
      initialized.value = true;
    }
    return isAuthenticated.value;
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      user.value = null;
      initialized.value = true;
    }
  }

  function clearSession() {
    user.value = null;
  }

  window.addEventListener('auth:unauthorized', clearSession);

  return {
    user,
    initialized,
    isAuthenticated,
    isAdmin,
    login,
    restoreSession,
    logout,
  };
});
