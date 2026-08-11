/**
 * Local API server (replaces `vercel dev` for /api/*).
 * Loads .env, then mounts each api/*.js Vercel-style handler.
 */
import { createServer } from 'http';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join, basename } from 'path';
import { pathToFileURL } from 'url';

function loadEnv() {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) {
    console.error('Missing .env — copy .env.example and fill Supabase keys.');
    process.exit(1);
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

const PORT = Number(process.env.API_PORT || 3001);

createServer(async (req, nodeRes) => {
  try {
    const parsed = new URL(req.url || '/', `http://localhost:${PORT}`);
    const parts = parsed.pathname.split('/').filter(Boolean);
    // Expect /api/<name>
    if (parts[0] !== 'api' || !parts[1]) {
      nodeRes.statusCode = 404;
      nodeRes.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
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
  } catch (err) {
    console.error('API error:', err);
    if (!nodeRes.headersSent) {
      nodeRes.statusCode = 500;
      nodeRes.setHeader('Content-Type', 'application/json');
      nodeRes.end(JSON.stringify({ error: err.message || 'Server error' }));
    }
  }
}).listen(PORT, () => {
  console.log(`API locale prête sur http://localhost:${PORT}`);
  console.log(`Routes: ${[...handlers.keys()].map((h) => `/api/${h}`).join(', ')}`);
});
