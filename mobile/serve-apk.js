const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const PORT = process.env.PORT || 8000
const HOST = '0.0.0.0'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.apk': 'application/vnd.android.package-archive',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.jks': 'application/octet-stream',
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0])
  if (urlPath === '/' || urlPath === '' || urlPath === '/index.html') {
    const files = fs.readdirSync(ROOT).filter((f) => /\.(apk|png|md)$/.test(f))
    const links = files
      .map((f) => {
        const size = fs.statSync(path.join(ROOT, f)).size
        const mb = (size / 1048576).toFixed(1)
        return `<li><a href="/${f}">${f}</a> (${mb} MB)</li>`
      })
      .join('')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VyGo APK download</title></head><body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:2rem"><h1>VyGo APK download</h1><ul style="line-height:2">${links}</ul><p>Tap <b>vygo.apk</b> to download, then <b>Install</b> when the prompt appears.</p></body></html>`
    )
  }
  const filePath = path.join(ROOT, path.normalize(urlPath))
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403)
    return res.end('Forbidden')
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      return res.end('Not found')
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
    })
    fs.createReadStream(filePath).pipe(res)
  })
})

server.listen(PORT, HOST, () => {
  console.log(`VyGo APK server running on http://0.0.0.0:${PORT}`)
})