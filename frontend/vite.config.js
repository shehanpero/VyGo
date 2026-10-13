import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The root-level shared asset directory lives one level above the Vite root
// (G:\PEROVIN\vygo\assets). It is the single source of truth for the app's 3D
// bus models (viking.glb, yutong-c12.glb). Vite's publicDir cannot point at
// it without dropping frontend/public, so a small plugin serves it at
// /assets during dev and copies it into dist/assets on build — the models
// stay in G:\PEROVIN\vygo\assets and are never duplicated in the source tree.
const vygoAssetsDir = fileURLToPath(new URL('../assets', import.meta.url))

function vygoAssets() {
  const MIME = {
    '.glb': 'model/gltf-binary',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.json': 'application/json',
  }
  let outDir = null

  return {
    name: 'vygo-assets',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use('/assets', (req, res, next) => {
        // Connect strips the '/assets' mount prefix from req.url when invoking
        // the handler, so tolerate both '/assets/viking.glb' and '/viking.glb'.
        const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/assets/, '')
        const rel = urlPath.replace(/^\/+/, '')
        const filePath = path.resolve(vygoAssetsDir, rel)
        if (filePath !== vygoAssetsDir && !filePath.startsWith(vygoAssetsDir + path.sep)) {
          return next()
        }
        const stat = fs.statSync(filePath, { throwIfNoEntry: false })
        if (!stat || !stat.isFile()) return next()
        res.statusCode = 200
        res.setHeader('Content-Type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-cache')
        fs.createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      if (!outDir) return
      const dest = path.join(outDir, 'assets')
      fs.mkdirSync(dest, { recursive: true })
      for (const name of fs.readdirSync(vygoAssetsDir)) {
        const src = path.join(vygoAssetsDir, name)
        if (!fs.statSync(src).isFile()) continue
        fs.copyFileSync(src, path.join(dest, name))
      }
    },
  }
}

// Vendor chunk families. Manual chunks apply only to production builds — the
// dev server/HMR is untouched (Vite ignores rollupOptions.output in serve mode).
//
// The goal is stable, cache-friendly units:
//   - app-code changes no longer invalidate React/router/axios/recharts bytes
//   - each lazy route pays only for the vendor family it actually uses
//   - content-hashed filenames get long-lived immutable Cache-Control in prod
//
// These map to the current dependency graph (package.json + what src actually
// imports). leaflet / qrcode are not installed/imported yet — the rules are
// future-proofing and simply emit nothing until those deps arrive.
//
// three + friends follow the same "future-proofing" pattern right now: the deps
// are in package.json but are installed centrally after this file lands, so the
// three-vendor / motion rules emit nothing until npm install completes.
const vendorChunkGroups = {
  // Core UI runtime + router: imported eagerly by main.jsx / Layout / every page.
  'react-vendor': /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run|loose-envify)\//,
  // Charts: recharts + its d3/graph/transition stack. Only lazy admin/operator
  // pages import it, so it never ships to passenger-facing routes. The family
  // must be self-contained (minus react/react-dom) or Rollup warns about
  // circular chunks — every recharts transitive dep is listed explicitly.
  'charts': /node_modules\/(recharts|recharts-scale|react-smooth|victory-vendor|d3-[^/]+|internmap|clsx|decimal\.js-light|eventemitter3|lodash|prop-types|react-is|react-transition-group|dom-helpers|fast-equals|tiny-invariant|@babel\/runtime)\//,
  // Icon set: tree-shaken by Rollup to the handful of used icons, but kept as a
  // stable unit so icon additions don't touch the React chunk.
  'icons': /node_modules\/react-icons\//,
  // QR rendering for seat/ticket flows (dependency present, not imported yet).
  'qrcode': /node_modules\/qrcode\.react\//,
  // Maps: not installed yet — when react-leaflet lands, it lands here, lazily.
  'leaflet': /node_modules\/(leaflet|react-leaflet)\//,
  // HTTP client: shared by the eager api client, own cache unit.
  'http': /node_modules\/axios\//,
  // 3D seat map: three.js + the React Three Fiber stack + gsap. Only the lazy
  // SeatSelect3D route (and its seat3d/* components) import these, so the whole
  // family stays off every passenger-facing route until the 3D picker opens.
  // The family is deliberately self-contained — the existing charts rule sets
  // the precedent that a chunk must own every transitive dep it pulls in, or
  // Rollup warns about circular chunks (e.g. drei -> three-stdlib -> three).
  // three/examples/jsm/... paths live under node_modules/three/ and are covered
  // by the `three` alternative automatically.
  'three-vendor': /node_modules\/(three|@react-three|@react-spring|@use-gesture|postprocessing|gsap|three-stdlib|maath|zustand|camera-controls|meshline|react-reconciler|react-use-measure|troika-[^/]+|its-fine|stats\.js|utility-types)\//,
  // Framer Motion: used only by the seat-3d overlays (SuccessScene). Kept as its
  // own cache unit so a motion bump never invalidates the 3D vendor chunk and
  // vice versa. @motionone/* is framer-motion's animation engine — own it here
  // so the chunk is self-contained (motion -> vendor -> three would cycle).
  'motion': /node_modules\/(framer-motion|@motionone|@emotion\/is-prop-valid)\//,
}

export default defineConfig({
  plugins: [react(), vygoAssets()],
  server: {
    port: 5173,
    // Bind 0.0.0.0 so the Expo WebView on a phone on the same LAN can reach the
    // dev server at http://<PC-LAN-IP>:5173.
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Modern-browser baseline. The app uses optional chaining / nullish
    // coalescing / async iterators — all natively supported in any browser
    // from 2020 on. es2020 output is smaller and faster to parse than ES5
    // legacy builds, and there is no IE-class audience here.
    target: 'es2020',
    // esbuild minification (Vite's default) — fastest to build, and produces
    // smaller output than terser for this codebase. No reason to change.
    minify: 'esbuild',
    // Sourcemaps are dev/debugging weight only; keep them out of prod assets.
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only route dependencies pulled from node_modules; app code stays in
          // the entry chunks it belongs to (so HMR/lazy routes stay granular).
          if (!id.includes('node_modules')) return undefined
          for (const [name, matcher] of Object.entries(vendorChunkGroups)) {
            if (matcher.test(id)) return name
          }
          // Any other node_modules dep: one shared stable bucket.
          return 'vendor'
        },
      },
    },
    // The charts family legitimately exceeds Vite's 500 kB default (d3 + recharts
    // ≈ 383 kB raw today, ~106 kB gzip), and the lazy three-vendor chunk (three
    // core + drei + postprocessing + gsap, ~1.1-1.4 MB raw today) blows well past
    // that. Raise the threshold so the warning only fires on real regressions,
    // not on expected heavy lazy chunks. Re-tune after the first post-install
    // build: three-vendor's actual raw size is the reference, and the gzip budget
    // lives in docs/3d-performance-budget.md.
    chunkSizeWarningLimit: 1100,
  },
})
