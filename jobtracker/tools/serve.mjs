#!/usr/bin/env node
/**
 * Zero-dependency static server for the production build.
 * Usage:  node tools/serve.mjs [port]
 *         (run from the project root; serves ./dist with SPA fallback)
 *
 * Lets you try the built app with no `npm install` and no dev tooling.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'

const ROOT = resolve(process.cwd(), 'dist')
const PORT = Number(process.argv[2]) || 4173
const HOST = '0.0.0.0'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname.endsWith('/')) pathname += 'index.html'

    // keep the lookup inside dist/
    let filePath = normalize(join(ROOT, pathname))
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden')
      return
    }

    let info = await stat(filePath).catch(() => null)
    if (info?.isDirectory()) {
      filePath = join(filePath, 'index.html')
      info = await stat(filePath).catch(() => null)
    }

    // client-side routing: unknown paths fall back to index.html
    if (!info) {
      filePath = join(ROOT, 'index.html')
      info = await stat(filePath).catch(() => null)
      if (!info) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('Build not found. Run `npm run build` first.')
        return
      }
    }

    const body = await readFile(filePath)
    const isHtml = filePath.endsWith('.html')
    res.writeHead(200, {
      'content-type': TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'content-length': body.length,
      // hashed assets can be cached hard; html must not be
      'cache-control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
    })
    res.end(body)
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' }).end(`Server error: ${err.message}`)
  }
})

server.listen(PORT, HOST, () => {
  console.log(`\n  Hiretrail (production build) → http://localhost:${PORT}\n  serving ${ROOT}\n  Ctrl+C to stop\n`)
})
