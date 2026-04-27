import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8081",
      "/healthz": "http://localhost:8081",
      "/Resume.pdf": "http://localhost:8081",
      "/CV_Ildar_en.pdf": "http://localhost:8081",
      "/CV_Ildar_ru.pdf": "http://localhost:8081"
    }
  }
});
