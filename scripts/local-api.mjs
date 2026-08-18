/**
 * Serves /api/* from api/*.js (Vercel-style handlers).
 *
 * Local dev (npm run dev): API only on port 3001. Vite serves the frontend.
 * Production on EC2 (NODE_ENV=production): API + the built frontend from dist/.
 */
import { createServer } from 'http';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, basename, extname } from 'path';
import { pathToFileURL } from 'url';

function loadEnv() {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || url.includes('YOUR_PROJECT') || !service || service.includes('your_service')) {
  console.error('Invalid Supabase keys in .env. Fix VITE_/NEXT_PUBLIC_ URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';
const distDir = resolve(process.cwd(), 'dist');

if (isProduction && !existsSync(join(distDir, 'index.html'))) {
  console.error('Missing dist/index.html — run npm run build before starting in production.');
  process.exit(1);
}

const apiDir = resolve(process.cwd(), 'api');
const handlers = new Map();

for (const file of readdirSync(apiDir)) {
  if (!file.endsWith('.js')) continue;
  // Skip non-route modules
  if (['db-client.js', 'db-wake.js', 'auth-helper.js'].includes(file)) continue;
  const name = basename(file, '.js');
  const mod = await import(pathToFileURL(join(apiDir, file)).href);
  if (typeof mod.default === 'function') {
    handlers.set(name, mod.default);
  }
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolveBody({});
      try {
        resolveBody(JSON.parse(raw));
      } catch {
        resolveBody({ raw });
      }
    });
    req.on('error', reject);
  });
}

function createRes(nodeRes) {
  let statusCode = 200;
  const res = {
    setHeader(k, v) {
      nodeRes.setHeader(k, v);
    },
    status(code) {
      statusCode = code;
      return res;
    },
    json(body) {
      if (!nodeRes.headersSent) {
        nodeRes.statusCode = statusCode;
        nodeRes.setHeader('Content-Type', 'application/json');
      }
      nodeRes.end(JSON.stringify(body ?? {}));
    },
    end(body) {
      nodeRes.statusCode = statusCode;
      nodeRes.end(body ?? '');
    },
  };
  return res;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function sendFile(nodeRes, filePath, statusCode = 200) {
  const body = readFileSync(filePath);
  nodeRes.statusCode = statusCode;
  nodeRes.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
  nodeRes.end(body);
}

function serveFrontend(req, nodeRes) {
  const parsed = new URL(req.url || '/', 'http://localhost');
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';

  const requested = resolve(distDir, '.' + pathname);
  if (!requested.startsWith(distDir)) {
    nodeRes.statusCode = 403;
    nodeRes.end('Forbidden');
    return;
  }

  if (existsSync(requested) && statSync(requested).isFile()) {
    sendFile(nodeRes, requested);
    return;
  }

  sendFile(nodeRes, join(distDir, 'index.html'));
}

const PORT = Number(process.env.PORT || process.env.API_PORT || (isProduction ? 3000 : 3001));
const HOST = process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1');

createServer(async (req, nodeRes) => {
  try {
    const parsed = new URL(req.url || '/', `http://localhost:${PORT}`);
    const parts = parsed.pathname.split('/').filter(Boolean);

    if (parts[0] === 'api' && parts[1]) {
      const name = parts[1];
      const handler = handlers.get(name);
      if (!handler) {
        nodeRes.statusCode = 404;
        nodeRes.end(JSON.stringify({ error: `Unknown API: ${name}` }));
        return;
      }

      const body =
        req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD'
          ? {}
          : await readBody(req);

      const query = Object.fromEntries(parsed.searchParams.entries());
      const vercelReq = {
        method: req.method,
        headers: req.headers,
        body,
        query,
        url: req.url,
      };
      const vercelRes = createRes(nodeRes);
      await handler(vercelReq, vercelRes);
      return;
    }

    if (isProduction) {
      serveFrontend(req, nodeRes);
      return;
    }

    nodeRes.statusCode = 404;
    nodeRes.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error('API error:', err);
    if (!nodeRes.headersSent) {
      nodeRes.statusCode = 500;
      nodeRes.setHeader('Content-Type', 'application/json');
      nodeRes.end(JSON.stringify({ error: err.message || 'Server error' }));
    }
  }
}).listen(PORT, HOST, () => {
  if (isProduction) {
    console.log(`StockAgence production listening on http://${HOST}:${PORT}`);
  } else {
    console.log(`API locale prête sur http://${HOST}:${PORT}`);
  }
  console.log(`Routes: ${[...handlers.keys()].map((h) => `/api/${h}`).join(', ')}`);
});
