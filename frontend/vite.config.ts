import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Replace __SITE_URL__ in index.html. When no public URL is configured
 * (local dev and CI), drop the canonical/og:url tags instead of shipping a
 * literal placeholder; og:image falls back to a root-relative path.
 */
const siteMeta = (siteUrl: string): Plugin => ({
  name: 'site-meta',
  transformIndexHtml(html) {
    if (siteUrl) return html.replaceAll('__SITE_URL__', siteUrl)
    return html
      .replace(/\s*<link rel="canonical"[^>]*>/g, '')
      .replace(/\s*<meta property="og:url"[^>]*>/g, '')
      // A relative url is invalid in structured data, so omit the property.
      .replace(/\s*"url": "__SITE_URL__\/",/g, '')
      .replaceAll('__SITE_URL__', '')
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads frontend/.env plus the shell environment. Render exposes the
  // public static-site URL automatically at build time.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = (env.VITE_SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? '').replace(/\/+$/, '')

  return {
    plugins: [react(), siteMeta(siteUrl)],
    build: {
      rollupOptions: {
        output: {
          // Keep the heavy dashboard-only libraries out of the initial bundle.
          // Vite 8 uses Rolldown, whose group syntax replaces the old object form
          // of manualChunks.
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|react-redux|redux|immer|reselect|@reduxjs[\\/]toolkit)[\\/]/,
              },
              {
                // tslib is a dependency of both echarts and several UI packages
                // used by the entry chunk. Give it its own tiny chunk so the
                // entry never has to preload the whole charting vendor bundle.
                name: 'shared-vendor',
                test: /node_modules[\\/]tslib[\\/]/,
              },
              {
                name: 'charts-vendor',
                test: /node_modules[\\/](echarts|echarts-for-react|zrender)[\\/]/,
              },
              {
                name: 'grid-vendor',
                test: /node_modules[\\/](ag-grid-community|ag-grid-react)[\\/]/,
              },
              {
                name: 'editor-vendor',
                test: /node_modules[\\/](@monaco-editor|monaco-editor)[\\/]/,
              },
              {
                name: 'motion-vendor',
                test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/,
              },
            ],
          },
        },
      },
    },
  }
})
