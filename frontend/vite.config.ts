import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
