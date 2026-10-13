import { proxyToBackend } from '../_shared/proxy.js'

// Catch-all for /api/* -> forwards to the live VyGo backend.
export const onRequest = (context) => proxyToBackend(context)
