import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "./env");

  /**
   * Proxy target, with a fallback for an unset or empty variable.
   *
   * Vite quietly substitutes `base.invalid` for an empty target, so every
   * proxied request fails with an opaque DNS error rather than anything that
   * points at the missing configuration. Fall back to the documented default
   * and say so instead.
   */
  const target = (name: string, fallback: string): string => {
    const value = env[name]?.trim();
    if (value) return value;
    console.warn(
      `[vite] ${name} is not set; proxying to ${fallback}. ` +
        `Set it in env/.env.${mode} to use a different service.`,
    );
    return fallback;
  };

  // One proxy definition, shared by `vite dev` and `vite preview`, so a built
  // bundle behaves the same as the dev server. In production nginx does this.
  const proxy = {
    "/api": {
      target: target("VITE_BACKEND_BASE_URL", "http://127.0.0.1:8000"),
      changeOrigin: true,
      secure: true,
      // The live recitation socket is served under /api, and without this the
      // upgrade request is proxied as a plain GET and the handshake fails.
      ws: true,
    },
    // Keeps the library API behind our own origin, so its host never appears in
    // a browser request and the X-Application header is added server-side
    // rather than shipped in the bundle.
    "/library": {
      target: target("VITE_LIBRARY_BASE_URL", "https://library.webuddhist.com"),
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(/^\/library/, ""),
      headers: {
        "X-Application": env.VITE_LIBRARY_APP_NAME?.trim() || "webuddhist",
      },
    },
    // Worker API (segment AI chat). Strips /worker, so
    // /worker/segment-chat/stream upstream becomes /segment-chat/stream.
    "/worker": {
      target: target("VITE_WORKER_URL", "http://127.0.0.1:8001"),
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(/^\/worker/, ""),
    },
    "/chats": {
      target: target("VITE_CHAT_API_URL", "http://127.0.0.1:8001"),
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path,
    },
    "/threads": {
      target: target("VITE_CHAT_API_URL", "http://127.0.0.1:8001"),
      changeOrigin: true,
      secure: true,
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    envDir: "./env",
    server: {
      host: true,
      port: 3000,
      open: true,
      proxy,
    },
    preview: {
      port: 4173,
      proxy,
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test-utils/CommonMocks.ts",
      coverage: {
        provider: "istanbul",
        reporter: ["text", "json", "html", "lcov"],
        reportsDirectory: "./coverage",
        exclude: [
          "**/*.ts",
          "**/*test.tsx",
          "src/config/**",
          "src/main.tsx",
          "src/App.tsx",
          "src/context/**",
          "src/utils/**",
          "dist/**",
          "src/layouts",
          "src/components/**",
          "src/routes/chat/components/atom/**",
          "src/routes/chat/context/**",
          "src/routes/chat/hooks/**",
          "src/routes/chat/ChatLayout.tsx",
          "src/routes/chat/ChatThread.tsx",
        ],
      },
    },
  };
});
