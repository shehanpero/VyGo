import { proxyToBackend } from '../_shared/proxy.js'

// Catch-all for /uploads/* -> forwards to the live VyGo backend so operator
// logos and other uploaded files load even though the frontend is on Pages.
export const onRequest = (context) => proxyToBackend(context)
