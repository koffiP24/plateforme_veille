// Le store d'authentification sera défini ici.
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
  const token = ref<string | null>(localStorage.getItem("access_token"));

  const storedUser = localStorage.getItem("current_user");

  const user = ref<CurrentUser | null>(
    storedUser ? JSON.parse(storedUser) : null,
  );

  const isAuthenticated = computed(
    () => Boolean(token.value) && Boolean(user.value),
  );

  const isAdmin = computed(() => user.value?.roles.includes("ADMIN"));

  async function login(email: string, password: string) {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    token.value = response.data.accessToken;

    user.value = response.data.user;

    localStorage.setItem("access_token", token.value!);

    localStorage.setItem("current_user", JSON.stringify(user.value));
  }

  function logout() {
    token.value = null;
    user.value = null;

    localStorage.removeItem("access_token");

    localStorage.removeItem("current_user");
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    login,
    logout,
  };
});
