import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWebServer as createBaseWebServer } from './server.js';

const VERSION = '1.5.1';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '../../web');
const V151_JS = fs.readFileSync(path.join(WEB_ROOT, 'v151.js'), 'utf8');
const V151_CSS = fs.readFileSync(path.join(WEB_ROOT, 'v151.css'), 'utf8');

const V15_FEATURES = [
  'template-categories',
  'template-search',
  'expanded-template-library',
  'smart-heading',
  'smart-callout',
  'smart-checklist',
  'smart-steps',
  'smart-facts',
  'smart-button-row',
  'smart-event',
  'smart-countdown',
  'smart-code',
  'smart-progress',
  'heading-emoji-picker'
];

function patchResponse(request, response) {
  const host = request.headers.host || 'localhost';
  const pathname = new URL(request.url || '/', `http://${host}`).pathname;
  if (!['/health', '/api/bootstrap', '/app.js', '/app.css'].includes(pathname)) return;

  const originalEnd = response.end.bind(response);
  response.end = (chunk, encoding, callback) => {
    const raw = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk ?? '');

    if (pathname === '/app.js') {
      return originalEnd(`${raw}\n\n${V151_JS}`, encoding, callback);
    }
    if (pathname === '/app.css') {
      return originalEnd(`${raw}\n\n${V151_CSS}`, encoding, callback);
    }

    try {
      const data = JSON.parse(raw);
      data.version = VERSION;
      if (pathname === '/health') {
        data.features = [...new Set([...(Array.isArray(data.features) ? data.features : []), ...V15_FEATURES])];
      }
      return originalEnd(JSON.stringify(data), encoding, callback);
    } catch {
      return originalEnd(chunk, encoding, callback);
    }
  };
}

export function createWebServer(options) {
  const server = createBaseWebServer(options);
  const listeners = server.listeners('request');
  if (listeners.length !== 1) return server;
  const original = listeners[0];
  server.removeAllListeners('request');
  server.on('request', (request, response) => {
    patchResponse(request, response);
    return original(request, response);
  });
  return server;
}
