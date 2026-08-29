import { createWebServer as createBaseWebServer } from './server.js';

const VERSION = '1.5.0';
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
  'smart-progress'
];

function patchJsonResponse(request, response) {
  const host = request.headers.host || 'localhost';
  const pathname = new URL(request.url || '/', `http://${host}`).pathname;
  if (!['/health', '/api/bootstrap'].includes(pathname)) return;

  const originalEnd = response.end.bind(response);
  response.end = (chunk, encoding, callback) => {
    try {
      const raw = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk ?? '');
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
    patchJsonResponse(request, response);
    return original(request, response);
  });
  return server;
}
