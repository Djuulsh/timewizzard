import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWebServer as createBaseWebServer } from './server.js';

const VERSION = '1.5.15';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '../../web');
const EXTRA_JS = ['v151.js', 'v152.js', 'v153.js', 'v154.js', 'v155.js', 'v156.js', 'v157.js', 'v158.js', 'v159.js', 'v1510.js', 'v1511.js', 'v1512.js', 'v1513.js', 'v1514.js', 'v1515.js'].map((fileName) => fs.readFileSync(path.join(WEB_ROOT, fileName), 'utf8')).join('\n\n');
const EXTRA_CSS = ['v151.css', 'v152.css', 'v153.css', 'v154.css', 'v155.css', 'v156.css', 'v157.css', 'v158.css', 'v159.css', 'v1510.css', 'v1511.css', 'v1512.css', 'v1513.css', 'v1515.css'].map((fileName) => fs.readFileSync(path.join(WEB_ROOT, fileName), 'utf8')).join('\n\n');

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
  'heading-emoji-picker',
  'sticky-editor-toolbar',
  'header-add-block',
  'block-picker-categories',
  'block-picker-search',
  'block-target-picker',
  'compact-post-actions',
  'inspector-ux-pass',
  'inline-character-counters',
  'character-threshold-colors',
  'markdown-toolbar-below-field',
  'inspector-location-header',
  'move-block-to-root',
  'textarea-autosize',
  'inline-field-validation',
  'preview-block-selection',
  'compact-heading-controls',
  'heading-none-in-emoji-picker',
  'block-tree-root-drag',
  'sticky-create-draft-actions',
  'touch-tap-block-move',
  'mobile-click-to-move',
  'touch-root-move-target',
  'universal-click-to-move',
  'native-block-drag-disabled',
  'drag-crash-hotfix',
  'pointer-events-block-drag',
  'hybrid-click-and-drag-move',
  'shared-block-move-core',
  'short-screen-dialog-actions',
  'whole-row-pointer-drag',
  'block-grip-colon',
  'block-panel-only-reorder',
  'resilient-dialog-footer',
  'discord-webbuilder-version',
  'whole-row-click-edit',
  'drag-threshold-click-preservation',
  'block-grip-double-colon',
  'separator-inline-toggle',
  'authoritative-double-colon-grip',
  'css-owned-block-grip',
  'definitive-double-colon-grip',
  'inspector-render-grip-stability',
  'facts-row-editor',
  'facts-two-column-preview',
  'facts-discord-insert-values',
  'facts-row-reorder',
  'facts-responsive-layout',
  'facts-fixed-visual-gap',
  'facts-proportional-font-safe-spacing',
  'facts-nbsp-fixed-gap',
  'facts-preview-publish-parity',
  'facts-no-fake-columns'
];

function patchResponse(request, response) {
  const host = request.headers.host || 'localhost';
  const pathname = new URL(request.url || '/', `http://${host}`).pathname;
  if (!['/health', '/api/bootstrap', '/app.js', '/app.css'].includes(pathname)) return;

  const originalEnd = response.end.bind(response);
  response.end = (chunk, encoding, callback) => {
    const raw = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk ?? '');

    if (pathname === '/app.js') return originalEnd(`${raw}\n\n${EXTRA_JS}`, encoding, callback);
    if (pathname === '/app.css') return originalEnd(`${raw}\n\n${EXTRA_CSS}`, encoding, callback);

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
