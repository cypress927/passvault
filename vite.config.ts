import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const STRICT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

const SINGLE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: data:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "worker-src 'self' blob: data:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

export default defineConfig(({ command, mode }) => {
  const single = mode === 'single'
  const pwa = mode === 'pwa'
  const csp = single ? SINGLE_CSP : STRICT_CSP

  return {
    plugins: [
      react(),
      {
        name: 'inject-csp',
        transformIndexHtml(html: string) {
          if (command !== 'build') return html
          return html.replace(
            '<!--CSP-->',
            `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
          )
        },
      },
    ],
    build: single
      ? {
          outDir: 'dist-single',
          emptyOutDir: true,
          assetsInlineLimit: 100000000,
          cssCodeSplit: false,
          rollupOptions: {
            output: {
              codeSplitting: false,
              manualChunks: undefined,
            },
          },
        }
      : pwa
        ? {
            outDir: 'dist-pwa',
            emptyOutDir: true,
          }
        : undefined,
  }
})
