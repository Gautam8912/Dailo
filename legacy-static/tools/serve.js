#!/usr/bin/env node
/**
 * Food Express — tools/serve.js
 *
 * Dependency-free development server for the static storefront.
 *
 *  - binds 0.0.0.0 so it works inside sandboxes, containers and proxied
 *    previews (never 127.0.0.1 only);
 *  - serves the generated root HTML pages, css/, js/ and shared/;
 *  - proxies /api/* to the Express backend (default http://127.0.0.1:5000) so
 *    browser code only ever talks to same-origin relative URLs;
 *  - falls back to 404.html with a real 404 status for unknown paths.
 *
 * When the backend is not running the proxy answers 503 with a JSON body, and
 * the front-end probe switches to demo mode (that switch is visible in the UI).
 *
 * Usage:
 *   node tools/serve.js                 # http://0.0.0.0:4173
 *   PORT=8080 node tools/serve.js
 *   API_PORT=5000 node tools/serve.js   # backend on a custom port
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 4173);
const API_TARGET_HOST = process.env.API_HOST || '127.0.0.1';
const API_TARGET_PORT = Number(process.env.API_PORT || 5000);
const QUIET = process.env.QUIET === '1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function log(message) {
  if (!QUIET) process.stdout.write(message + '\n');
}

function send(res, status, body, headers) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  res.writeHead(status, Object.assign({
    'Content-Length': payload.length,
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  }, headers || {}));
  res.end(payload);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8' });
}

/** Resolve a request path to a file inside ROOT, or null when it escapes. */
function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  if (decoded.indexOf('\0') !== -1) return null;
  const relative = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const absolute = path.join(ROOT, relative);
  if (absolute !== ROOT && !absolute.startsWith(ROOT + path.sep)) return null;
  return absolute;
}

function serveStatic(req, res, pathname) {
  let absolute = resolveFile(pathname);
  if (!absolute) {
    send(res, 400, 'Bad request');
    return;
  }

  let stats = null;
  try {
    stats = fs.statSync(absolute);
  } catch (err) {
    stats = null;
  }

  if (stats && stats.isDirectory()) {
    absolute = path.join(absolute, 'index.html');
    try {
      stats = fs.statSync(absolute);
    } catch (err) {
      stats = null;
    }
  }

  if (!stats || !stats.isFile()) {
    // Unknown path → the generated 404 page with a genuine 404 status.
    const notFound = path.join(ROOT, '404.html');
    if (fs.existsSync(notFound)) {
      send(res, 404, fs.readFileSync(notFound), { 'Content-Type': MIME['.html'] });
    } else {
      send(res, 404, '404 — page not found');
    }
    return;
  }

  const ext = path.extname(absolute).toLowerCase();
  send(res, 200, fs.readFileSync(absolute), {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'no-cache',
  });
}

/** Forward /api/* to the Express backend. */
function proxyApi(req, res, parsed) {
  const options = {
    host: API_TARGET_HOST,
    port: API_TARGET_PORT,
    method: req.method,
    path: parsed.path,
    headers: Object.assign({}, req.headers, { host: API_TARGET_HOST + ':' + API_TARGET_PORT }),
  };

  const upstream = http.request(options, (upstreamRes) => {
    const chunks = [];
    upstreamRes.on('data', (chunk) => chunks.push(chunk));
    upstreamRes.on('end', () => {
      const headers = Object.assign({}, upstreamRes.headers);
      delete headers['content-length'];
      delete headers['transfer-encoding'];
      send(res, upstreamRes.statusCode || 502, Buffer.concat(chunks), headers);
    });
  });

  upstream.on('error', (err) => {
    // The storefront treats this as "backend unavailable" and falls back to
    // demo mode, which is surfaced honestly in the UI.
    sendJson(res, 503, {
      success: false,
      error: 'Backend unreachable',
      message: 'The Food Express API at http://' + API_TARGET_HOST + ':' + API_TARGET_PORT + ' is not responding (' + err.code + '). The storefront continues in local demo mode.',
      hint: 'Start it with: npm run backend  (requires MONGO_URI in backend/.env)',
    });
  });

  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname || '/';

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    proxyApi(req, res, parsed);
    log('→ api ' + req.method + ' ' + pathname);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { success: false, error: 'Method not allowed' });
    return;
  }

  serveStatic(req, res, pathname === '/' ? '/index.html' : pathname);
  log('· ' + req.method + ' ' + pathname);
});

server.listen(PORT, HOST, () => {
  const shown = HOST === '0.0.0.0' ? 'localhost' : HOST;
  log('Food Express storefront → http://' + shown + ':' + PORT + '/  (bound to ' + HOST + ')');
  log('API proxy             → /api/* → http://' + API_TARGET_HOST + ':' + API_TARGET_PORT);
  log('Demo mode works without the backend; start it with `npm run backend` when MongoDB is available.');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    process.stderr.write('Port ' + PORT + ' is already in use. Try: PORT=' + (PORT + 1) + ' node tools/serve.js\n');
    process.exit(1);
  }
  throw err;
});
