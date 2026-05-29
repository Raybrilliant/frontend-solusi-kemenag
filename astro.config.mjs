// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import svelte from "@astrojs/svelte";

import icon from "astro-icon";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  site: "https://kemenagkotaprobolinggo.id",
  output: "server",
  security: {
    allowedDomains: [
      { hostname: "kemenagkotaprobolinggo.id", protocol: "https" },
      { hostname: "www.kemenagkotaprobolinggo.id", protocol: "https" },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        "@tanstack/table-core",
        "@editorjs/editorjs",
        "@editorjs/paragraph",
        "@editorjs/header",
        "@editorjs/image",
        "@editorjs/list",
        "@editorjs/checklist",
        "@editorjs/quote",
        "@editorjs/delimiter",
        "@editorjs/table",
        "@editorjs/code",
        "@editorjs/inline-code",
        "@editorjs/marker",
        "@editorjs/warning",
        "@editorjs/embed",
        "editorjs-undo",
      ],
      exclude: ["@tanstack/svelte-table"],
    },
  },

  integrations: [svelte(), icon()],

  adapter: node({ mode: "standalone" }),
});
