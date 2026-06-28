import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Mobile-first, presupuesto de bundle ajustado: el mapa (Leaflet) se carga de forma
// diferida mediante import() dinámico para no penalizar el primer pintado en 3G (SC-004).
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          // Aísla Leaflet en su propio chunk, cargado solo cuando se monta el mapa.
          leaflet: ["leaflet"],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
