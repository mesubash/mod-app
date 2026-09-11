import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // Vite resolves tsconfig paths natively; the plugin warns that it is
  // redundant.
  resolve: { tsconfigPaths: true },
  // MapLibre fetches and parses every tile in a web worker. Pre-bundling it
  // breaks the worker entry, and the failure is silent from the page's side:
  // the map initialises, the style and sprites load, the attribution renders,
  // and not one tile is ever requested.
  optimizeDeps: { exclude: ["maplibre-gl"] },
  plugins: [
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this
      server: { entry: "server" },
    }),
    nitro(),
    viteReact(),
  ],
});
