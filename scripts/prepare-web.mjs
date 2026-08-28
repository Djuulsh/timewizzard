import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const appPath = path.join(root, 'web', 'app.js');
const cssPath = path.join(root, 'web', 'app.css');
const htmlPath = path.join(root, 'web', 'index.html');
const MARKER = 'DISCORD_MARKDOWN_PREVIEW_V2';

function safeLinkTarget(value) {
  try {
    const url = new URL(String(value ?? '').replaceAll('&amp;', '&'));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function discordRelativeTime(date) {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  let value = seconds;
  let unit = 'second';
  if (abs >= 31_536_000) { value = Math.round(seconds / 31_536_000); unit = 'year'; }
  else if (abs >= 2_592_000) { value = Math.round(seconds / 2_592_000); unit = 'month'; }
  else if (abs >= 604_800) { value = Math.round(seconds / 604_800); unit = 'week'; }
  else if (abs >= 86_400) { value = Math.round(seconds / 86_400); unit = 'day'; }
  else if (abs >= 3_600) { value = Math.round(seconds / 3_600); unit = 'hour'; }
  else if (abs >= 60) { value = Math.round(seconds / 60); unit = 'minute'; }
  return new Intl.RelativeTimeFormat(navigator.language || 'en', { numeric: 'auto' }).format(value, unit);
}

function renderDiscordTimestamp(epoch, style = 'f') {
  const date = new Date(Number(epoch) * 1000);
  if (Number.isNaN(date.getTime())) return String(epoch);
  if (style === 'R') return discordRelativeTime(date);

  const locale = navigator.language || 'en-US';
  const dateOptions = {
    t: { hour: '2-digit', minute: '2-digit' },
    T: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
    d: { year: 'numeric', month: '2-digit', day: '2-digit' },
    D: { year: 'numeric', month: 'long', day: 'numeric' },
    f: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    F: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    s: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
    S: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }
  };
  return new Intl.DateTimeFormat(locale, dateOptions[style] || dateOptions.f).format(date);
}

function renderInline(text) {
  const tokens = [];
  const stash = (html) => {
    const index = tokens.push(html) - 1;
    return `\uE000${index}\uE001`;
  };

  let raw = String(text ?? '');
  raw = raw.replace(/\\([\\`*_{}\[\]()#+\-.!>|~])/g, (_, value) => stash(escapeHtml(value)));
  raw = raw.replace(/`([^`\n]+)`/g, (_, code) => stash(`<code class="discord-inline-code">${escapeHtml(code)}</code>`));
  raw = raw.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi, (_, label, href) => {
    const target = safeLinkTarget(href);
    return target ? stash(`<a class="discord-link" href="${escapeAttr(target)}" target="_blank" rel="noreferrer">${renderInline(label)}</a>`) : `${label} (${href})`;
  });
  raw = raw.replace(/<(https?:\/\/[^>\s]+)>/gi, (_, href) => {
    const target = safeLinkTarget(href);
    return target ? stash(`<a class="discord-link" href="${escapeAttr(target)}" target="_blank" rel="noreferrer">${escapeHtml(href)}</a>`) : href;
  });

  let out = escapeHtml(raw);
  out = out.replace(/__\*\*\*(.+?)\*\*\*__/g, '<u><strong><em>$1</em></strong></u>');
  out = out.replace(/__\*\*(.+?)\*\*__/g, '<u><strong>$1</strong></u>');
  out = out.replace(/__\*(.+?)\*__/g, '<u><em>$1</em></u>');
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__(.+?)__/g, '<u>$1</u>');
  out = out.replace(/~~(.+?)~~/g, '<s>$1</s>');
  out = out.replace(/\|\|(.+?)\|\|/g, '<span class="discord-spoiler" title="Spoiler">$1</span>');
  out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  out = out.replace(/(^|[^\w])_([^_\n]+)_($|[^\w])/g, '$1<em>$2</em>$3');

  out = out.replace(/&lt;a:([A-Za-z0-9_]+):(\d+)&gt;/g, '<img class="inline-emoji" alt="$1" src="https://cdn.discordapp.com/emojis/$2.webp?size=32&animated=true">');
  out = out.replace(/&lt;:([A-Za-z0-9_]+):(\d+)&gt;/g, '<img class="inline-emoji" alt="$1" src="https://cdn.discordapp.com/emojis/$2.webp?size=32&quality=lossless">');
  out = out.replace(/&lt;@!?(\d+)&gt;/g, '<span class="discord-mention">@user:$1</span>');
  out = out.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="discord-mention role">@role:$1</span>');
  out = out.replace(/&lt;#(\d+)&gt;/g, '<span class="discord-mention channel">#channel:$1</span>');
  out = out.replace(/&lt;\/([^:]+):(\d+)&gt;/g, '<span class="discord-mention command">/$1</span>');
  out = out.replace(/&lt;t:(\d+)(?::([tTdDfFsSR]))?&gt;/g, (_, epoch, style) => `<span class="discord-timestamp">${escapeHtml(renderDiscordTimestamp(epoch, style || 'f'))}</span>`);
  out = out.replace(/&lt;id:([A-Za-z0-9_-]+)(?::(\d+))?&gt;/g, (_, type, id) => `<span class="discord-mention navigation">${escapeHtml(id ? `${type}:${id}` : type)}</span>`);

  return out.replace(/\uE000(\d+)\uE001/g, (_, index) => tokens[Number(index)] ?? '');
}

function renderMarkdown(content) {
  const lines = String(content || '').split(/\r?\n/);
  const html = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      html.push(`<pre class="discord-codeblock">${language ? `<span class="discord-code-language">${escapeHtml(language)}</span>` : ''}<code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (line === '>>>' || line.startsWith('>>> ')) {
      const first = line === '>>>' ? '' : line.slice(4);
      const rest = [first, ...lines.slice(index + 1)];
      html.push(`<blockquote class="discord-quote multiline">${rest.map((part) => renderInline(part)).join('<br>')}</blockquote>`);
      break;
    }

    if (line.startsWith('> ')) {
      html.push(`<blockquote class="discord-quote">${renderInline(line.slice(2))}</blockquote>`);
      continue;
    }
    if (line.startsWith('-# ')) {
      html.push(`<div class="discord-subtext">${renderInline(line.slice(3))}</div>`);
      continue;
    }
    if (line.startsWith('### ')) { html.push(`<h3>${renderInline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## ')) { html.push(`<h2>${renderInline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# ')) { html.push(`<h1>${renderInline(line.slice(2))}</h1>`); continue; }

    const unordered = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (unordered) {
      const depth = Math.floor(unordered[1].length / 2);
      html.push(`<div class="discord-list-item" style="--list-depth:${depth}"><span>•</span><div>${renderInline(unordered[2])}</div></div>`);
      continue;
    }

    const ordered = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (ordered) {
      const depth = Math.floor(ordered[1].length / 2);
      html.push(`<div class="discord-list-item ordered" style="--list-depth:${depth}"><span>${escapeHtml(ordered[2])}.</span><div>${renderInline(ordered[3])}</div></div>`);
      continue;
    }

    if (!line.trim()) {
      html.push('<div class="discord-blank-line"></div>');
      continue;
    }
    html.push(`<div>${renderInline(line)}</div>`);
  }
  return html.join('');
}

async function patchApp() {
  let source = await fs.readFile(appPath, 'utf8');
  if (source.includes(MARKER)) return false;
  const start = source.indexOf('function renderInline(text) {');
  const end = source.indexOf('\nfunction profileSelectOptions()', start);
  if (start < 0 || end < 0) throw new Error('Could not locate the Markdown preview functions in web/app.js.');
  const functions = [safeLinkTarget, discordRelativeTime, renderDiscordTimestamp, renderInline, renderMarkdown]
    .map((fn) => fn.toString())
    .join('\n\n');
  source = `${source.slice(0, start)}// ${MARKER}\n${functions}${source.slice(end)}`;
  await fs.writeFile(appPath, source, 'utf8');
  return true;
}

const markdownCss = `
/* ${MARKER} */
.preview-text a.discord-link, .preview-row a.discord-link { color:#00a8fc; text-decoration:none; }
.preview-text a.discord-link:hover, .preview-row a.discord-link:hover { text-decoration:underline; }
.discord-subtext { color:#949ba4; font-size:10px; line-height:1.25; margin:2px 0; }
.discord-spoiler { background:#1e1f22; color:transparent; border-radius:3px; padding:0 2px; cursor:pointer; }
.discord-spoiler:hover { color:#dbdee1; }
.discord-inline-code { background:#1e1f22; border-radius:3px; padding:1px 4px; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:.92em; }
.discord-codeblock { position:relative; margin:6px 0; padding:10px; background:#1e1f22; border:1px solid #111214; border-radius:4px; overflow:auto; color:#dbdee1; font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; white-space:pre-wrap; }
.discord-codeblock code { font:inherit; }
.discord-code-language { display:block; color:#949ba4; font-size:9px; margin-bottom:5px; text-transform:uppercase; letter-spacing:.05em; }
.discord-quote { border-left:3px solid #4e5058; margin:3px 0; padding:1px 0 1px 8px; color:#dbdee1; }
.discord-quote.multiline { padding-top:3px; padding-bottom:3px; }
.discord-list-item { display:grid; grid-template-columns:14px 1fr; gap:3px; margin-left:calc(var(--list-depth,0) * 16px); }
.discord-list-item.ordered { grid-template-columns:24px 1fr; }
.discord-blank-line { height:6px; }
.discord-mention { display:inline-block; border-radius:3px; padding:0 2px; color:#c9cdfb; background:rgba(88,101,242,.28); font-weight:600; }
.discord-mention.channel { color:#c9cdfb; }
.discord-mention.command { color:#d7d9ff; }
.discord-timestamp { border-radius:3px; background:#1e1f22; padding:0 2px; }
.markdown-help { margin-top:12px; border:1px solid var(--line); border-radius:10px; background:var(--panel-2); }
.markdown-help summary { cursor:pointer; padding:10px 11px; font-size:11px; font-weight:750; color:#d8dbe0; }
.markdown-help-content { border-top:1px solid var(--line-soft); padding:10px 11px; color:var(--muted); font-size:10px; line-height:1.45; }
.markdown-help-grid { display:grid; grid-template-columns:minmax(105px,.8fr) 1.2fr; gap:5px 8px; }
.markdown-help-grid code { color:#e3e5e8; background:#0f1217; border-radius:4px; padding:2px 4px; overflow-wrap:anywhere; }
.markdown-help-note { margin:9px 0 0; color:#949ba4; }
`;

async function patchCss() {
  let source = await fs.readFile(cssPath, 'utf8');
  if (source.includes(MARKER)) return false;
  source = `${source.trimEnd()}\n${markdownCss}`;
  await fs.writeFile(cssPath, source, 'utf8');
  return true;
}

const markdownHelp = `
            <details class="markdown-help">
              <summary>Discord Markdown reference</summary>
              <div class="markdown-help-content">
                <div class="markdown-help-grid">
                  <code># / ## / ###</code><span>Headings</span>
                  <code>-# small text</code><span>Subtext</span>
                  <code>**bold**</code><span>Bold</span>
                  <code>*italic*</code><span>Italic</span>
                  <code>__underline__</code><span>Underline</span>
                  <code>~~strike~~</code><span>Strikethrough</span>
                  <code>||spoiler||</code><span>Spoiler</span>
                  <code>\u0060code\u0060</code><span>Inline code</span>
                  <code>\u0060\u0060\u0060...\u0060\u0060\u0060</code><span>Code block</span>
                  <code>&gt; quote</code><span>Single-line quote</span>
                  <code>&gt;&gt;&gt; quote</code><span>Multi-line quote</span>
                  <code>- item / 1. item</code><span>Lists; indent with 2 spaces</span>
                  <code>[text](https://...)</code><span>Masked link</span>
                  <code>&lt;:name:id&gt;</code><span>Custom emoji</span>
                  <code>&lt;@id&gt; / &lt;#id&gt;</code><span>User/channel mentions</span>
                  <code>&lt;t:unix:R&gt;</code><span>Discord timestamp</span>
                </div>
                <p class="markdown-help-note">Published Text Display blocks use Discord's native Markdown. The live preview now mirrors the common syntax above. Mentions are sent with notifications disabled by the bot.</p>
              </div>
            </details>`;

async function patchHtml() {
  let source = await fs.readFile(htmlPath, 'utf8');
  if (source.includes('Discord Markdown reference')) return false;
  const needle = `            <div id="inspector" class="inspector-placeholder">\n              Select a block to edit it.\n            </div>`;
  if (!source.includes(needle)) throw new Error('Could not locate the inspector in web/index.html.');
  source = source.replace(needle, `${needle}${markdownHelp}`);
  await fs.writeFile(htmlPath, source, 'utf8');
  return true;
}

const changed = await Promise.all([patchApp(), patchCss(), patchHtml()]);
console.log(changed.some(Boolean)
  ? 'Prepared Web Builder: Discord Markdown preview/help enabled.'
  : 'Web Builder Markdown preview already prepared.');
