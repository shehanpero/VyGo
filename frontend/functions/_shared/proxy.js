// Shared proxy used by the /api/* and /uploads/* Pages Functions.
// It forwards the request to whatever backend origin is currently stored in
// the VYGO_KV namespace under the key "backend_origin". The local startup
// script (scripts/start-vygo.ps1) updates that key whenever the tunnel URL
// changes, so https://vygo-perovin.pages.dev keeps working after a restart
// without redeploying — truly self-healing.
export async function proxyToBackend({ request, env }) {
  const origin = env.VYGO_KV ? await env.VYGO_KV.get('backend_origin') : null
  if (!origin) {
    return new Response(
      JSON.stringify({ error: 'VyGo backend not configured yet' }),
      { status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } }
    )
  }

  const inUrl = new URL(request.url)
  const base = String(origin).replace(/\/+$/, '')
  const target = new URL(base + inUrl.pathname + inUrl.search)

  const headers = new Headers(request.headers)
  headers.delete('host')

  const init = { method: request.method, headers, redirect: 'manual' }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  let resp
  try {
    resp = await fetch(target.toString(), init)
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'VyGo backend unreachable', detail: String(err) }),
      { status: 502, headers: { 'content-type': 'application/json; charset=utf-8' } }
    )
  }

  const outHeaders = new Headers(resp.headers)
  outHeaders.delete('content-length')
  outHeaders.delete('content-encoding')
  return new Response(resp.body, { status: resp.status, headers: outHeaders })
}
