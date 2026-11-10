import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "worker-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: 'inject-csp',
      transformIndexHtml(html: string) {
        if (command !== 'build') return html
        return html.replace(
          '<!--CSP-->',
          `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        )
      },
    },
  ],
}))
