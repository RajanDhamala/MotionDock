import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig(({ command }) => {
  const isDev = command === "serve" // true only in dev

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: isDev
      ? {
          //host: true,
          port: 5173,
          proxy: {
            "/api": {
              target: "http://127.0.0.1:8080",
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ""), // remove /api only in dev
            },
          },
        }
      : undefined, // in build/production, no proxy
  }
})
