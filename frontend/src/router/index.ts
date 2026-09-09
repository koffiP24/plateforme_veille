// Les routes de l'application seront définies ici.
import { createRouter, createWebHistory } from "vue-router";

import LoginView from "../views/LoginView.vue";
import DashboardView from "../views/DashboardView.vue";
import UsersView from "../views/UsersView.vue";

import SourcesView from "../views/SourcesView.vue";

const router = createRouter({
  history: createWebHistory(),

  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },

    {
      path: "/",
      name: "dashboard",
      component: DashboardView,
      meta: {
        requiresAuth: true,
      },
    },

    {
      path: "/users",
      name: "users",
      component: UsersView,

      meta: {
        requiresAuth: true,
        adminOnly: true,
      },
    },
    {
      path: "/sources",
      name: "sources",
      component: SourcesView,

      meta: {
        requiresAuth: true,
      },
    },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem("access_token");

  const userString = localStorage.getItem("current_user");

  const user = userString ? JSON.parse(userString) : null;

  if (to.meta.requiresAuth && !token) {
    return "/login";
  }

  if (to.meta.adminOnly && !user?.roles?.includes("ADMIN")) {
    return "/";
  }

  if (to.path === "/login" && token) {
    return "/";
  }
});

export default router;
