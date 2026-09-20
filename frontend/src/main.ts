import { createApp } from "vue";
import { createPinia } from "pinia";

import PrimeVue from "primevue/config";
import { primevueFr } from './i18n/primevue-fr';
import ToastService from "primevue/toastservice";
import Aura from "@primeuix/themes/aura";

import App from "./App.vue";
import router from "./router";

import "./style.css";
import "primeicons/primeicons.css";

const app = createApp(App);

app.use(createPinia());

app.use(router);
app.use(ToastService);

app.use(PrimeVue, {
  locale: primevueFr,
  ripple: true,
  theme: {
    preset: Aura,
  },
});

app.mount("#app");
