// Les routes de l'application seront définies ici.
import { createRouter, createWebHistory } from "vue-router";

import LoginView from "../views/LoginView.vue";
import DashboardView from "../views/DashboardView.vue";
import UsersView from "../views/UsersView.vue";

import SourcesView from "../views/SourcesView.vue";
import WatchItemsView from "../views/WatchItemsView.vue";
import WatchItemQualificationView from "../views/WatchItemQualificationView.vue";

import TaxonomyView from "../views/TaxonomyView.vue";

const router = createRouter({
  history: createWebHistory(),

  routes: [
    {
      path: "/watch-items/:id/qualification",
      name: "watch-item-qualification",
      component: WatchItemQualificationView,
      meta: {
        requiresAuth: true,
        roles: ["ADMIN", "RESPONSABLE_VEILLE", "OPERATEUR_VEILLE"],
      },
    },
    {
      path: "/watch-items",
      name: "watch-items",
      component: WatchItemsView,
      meta: {
        requiresAuth: true,
        roles: ["ADMIN", "RESPONSABLE_VEILLE", "OPERATEUR_VEILLE"],
      },
    },
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
      path: "/taxonomy",
      name: "taxonomy",
      component: TaxonomyView,

      meta: {
        requiresAuth: true,
        roles: ["ADMIN"],
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

  let userRoles: string[] = [];
  try {
    const user = userString ? JSON.parse(userString) : null;
    if (Array.isArray(user?.roles)) {
      userRoles = user.roles.filter((role: unknown): role is string => typeof role === "string");
    }
  } catch {
    // Un stockage illisible ne doit accorder aucun rôle.
    userRoles = [];
  }

  if (to.meta.requiresAuth && !token) {
    return { name: "login" };
  }

  if (to.meta.adminOnly && !userRoles.includes("ADMIN")) {
    return { name: "dashboard" };
  }

  if (
    Array.isArray(to.meta.roles) &&
    to.meta.roles.length > 0 &&
    !to.meta.roles.some((role) => userRoles.includes(role))
  ) {
    return { name: "dashboard" };
  }

  if (to.name === "login" && token) {
    return { name: "dashboard" };
  }
  return true;
});

export default router;
