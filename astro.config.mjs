// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import svelte from "@astrojs/svelte";

import icon from "astro-icon";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["@tanstack/table-core"],
      exclude: ["@tanstack/svelte-table"],
    },
  },

  integrations: [svelte(), icon()],

  adapter: node({ mode: "standalone" }),
});
