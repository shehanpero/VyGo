import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import baseConfig from './vite.config.js'

// Self-contained single-file build for the Expo WebView shell. Everything
// (JS, CSS, fonts, inline images) is inlined into one index.html so the Expo
// app can load the whole frontend from a single bundled asset with no server.
// Note: the 3D bus models under /assets are fetched at runtime by three.js
// and can't be inlined — in the offline bundle the 3D picker falls back to
// the 2D seat map (dev mode via the LAN Vite server keeps full 3D).
export default defineConfig({
  ...baseConfig,
  base: './',
  plugins: [...(baseConfig.plugins || []), viteSingleFile({ useRecommendedBuildConfig: true })],
  build: {
    ...(baseConfig.build || {}),
    outDir: 'dist-single',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 40000,
    rollupOptions: {
      output: {
        // inlineDynamicImports (set by vite-plugin-singlefile) forbids manual
        // chunks — everything goes into the single entry module.
        manualChunks: undefined,
      },
    },
  },
})
