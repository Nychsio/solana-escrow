import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static build, no server logic. `global` is aliased for libraries written for Node.
export default defineConfig({
  plugins: [react()],
  define: { global: "globalThis" },
  base: "./",
});
