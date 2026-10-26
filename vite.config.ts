import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

const BUILD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

// The dev server needs its React refresh preamble and HMR WebSocket. The
// production build keeps a strict script-src with no inline execution.
// frame-ancestors is delivered in public/_headers because browsers ignore it
// in a meta CSP; the meta policy keeps the rest enforceable in any static host.
const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' ws: http://localhost:* http://127.0.0.1:*",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

function cspPlugin(): Plugin {
  return {
    name: "jadu-tona-csp",
    transformIndexHtml: {
      order: "post",
      handler(html, context) {
        const csp = context.server ? DEV_CSP : BUILD_CSP;
        return html.replace(
          "<head>",
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
        );
      },
    },
  };
}

// Static, local-first build. No backend, no secrets, no third-party calls.
export default defineConfig({
  plugins: [react(), cspPlugin()],
  base: "./",
  build: {
    target: "es2022",
    sourcemap: false,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
