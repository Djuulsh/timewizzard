import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ChannelType } from 'discord.js';
import { WOW_CLASSES, RESOLUTIONS, findClass, findResolution } from '../constants.js';
import { createBuilderTemplate, POST_TEMPLATES } from '../builder/templates.js';
import { makeShortId } from '../builder/ids.js';
import { getBuilderStats } from '../builder/render.js';
import { validateBuilder } from '../builder/validate.js';
import {
  destinationTypeForChannel,
  getDestinationChannelId,
  getDestinationType,
  validateDestination
} from '../destinations.js';
import { createManagedPost, deleteManagedPost, updateManagedPost } from '../postService.js';
import { normalizeGeneratedString } from '../utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '../../web');
const SESSION_COOKIE = 'sib_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;
const VERSION = '1.2.2';

function json(response, status, data, headers = {}) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  });
  response.end(JSON.stringify(data));
}

function text(response, status, body, contentType = 'text/plain; charset=utf-8', headers = {}) {
  response.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
    ...headers
  });
  response.end(body);
}

function redirect(response, location, headers = {}) {
  response.writeHead(302, { location, 'cache-control': 'no-store', ...headers });
  response.end();
}

function parseCookies(request) {
  const cookies = {};
  for (const part of String(request.headers.cookie ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function sessionCookie(token, secure) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure ? '; Secure' : ''}`;
}

function clearSessionCookie(secure) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

async function readJsonBody(request, maxBytes = 1_500_000) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) throw Object.assign(new Error('Request body is too large.'), { statusCode: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON body.'), { statusCode: 400 });
  }
}

function isPostModified(post) {
  if (!post?.publishedBuilder) return false;
  return post.title !== post.publishedTitle || JSON.stringify(post.builder) !== JSON.stringify(post.publishedBuilder);
}

function entitySummary(entity, kind) {
  const destinationChannelId = getDestinationChannelId(entity);
  return {
    kind,
    id: kind === 'd' ? entity.id : entity.threadId,
    title: entity.title,
    modified: kind === 'p' ? isPostModified(entity) : true,
    destinationType: entity.destinationType || (kind === 'p' ? getDestinationType(entity) : 'forum'),
    destinationChannelId,
    // Legacy field retained for older browser clients.
    forumId: destinationChannelId,
    updatedAt: entity.updatedAt ?? null,
    publishedAt: entity.publishedAt ?? null
  };
}

function resolveEntity(store, kind, id) {
  const entity = kind === 'd' ? store.getDraft(id) : kind === 'p' ? store.getPost(id) : null;
  return entity ? { kind, id, entity } : null;
}

async function saveEntity(store, kind, entity) {
  const copy = structuredClone(entity);
  copy.updatedAt = new Date().toISOString();
  copy.builder = validateBuilder(copy.builder);
  if (kind === 'd') await store.saveDraft(copy);
  else if (kind === 'p') await store.savePost(copy);
  else throw new Error('Unknown entity kind.');
  return copy;
}

function ensureDestination(channel, tagId) {
  const error = validateDestination(channel, tagId);
  if (error) throw Object.assign(new Error(error), { statusCode: 400 });
  return destinationTypeForChannel(channel);
}

async function cloneEntityToDraft(store, source, kind, userId, titleOverride = null) {
  const destinationChannelId = getDestinationChannelId(source);
  if (!destinationChannelId) throw new Error('Opslaget har ingen gemt destination.');
  const now = new Date().toISOString();
  const draft = {
    id: makeShortId(4),
    title: String(titleOverride || `${source.title} (kopi)`).slice(0, 100),
    forumId: destinationChannelId,
    destinationType: source.destinationType || (kind === 'p' ? getDestinationType(source) : 'forum'),
    destinationChannelId,
    appliedTagIds: [...(source.appliedTagIds ?? [])],
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    clonedFrom: { kind, id: kind === 'd' ? source.id : source.threadId },
    builder: validateBuilder(structuredClone(source.builder))
  };
  await store.saveDraft(draft);
  return draft;
}

async function serveFile(response, fileName, contentType) {
  try {
    const data = await fs.readFile(path.join(WEB_ROOT, fileName));
    response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-cache' });
    response.end(data);
  } catch {
    text(response, 404, 'Not found');
  }
}

function authSetupPage(config) {
  return `<!doctype html><html lang="da"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Timewizzard</title><style>body{font-family:system-ui;background:#111318;color:#eee;max-width:760px;margin:80px auto;padding:24px}a{color:#8ab4ff}.card{background:#1b1e25;border:1px solid #30343d;border-radius:14px;padding:24px}code{background:#0d0f13;padding:3px 6px;border-radius:5px}</style><div class="card"><h1>Timewizzard Web Builder v${VERSION}</h1>${config.webEnabled ? '<p>Web Builder er aktiv.</p><p><a href="/auth/discord">Log ind med Discord</a></p>' : '<p>Discord-botten kører, men Web Builder er ikke konfigureret endnu.</p><p>Tilføj <code>DISCORD_CLIENT_SECRET</code> og <code>PUBLIC_BASE_URL</code> i Railway og redeploy.</p>'}</div></html>`;
}

export function createWebServer({ client, store, config }) {
  const sessions = new Map();
  const oauthStates = new Map();
  const secureCookies = config.publicBaseUrl.startsWith('https://');

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessions) if (value.expiresAt <= now) sessions.delete(key);
    for (const [key, value] of oauthStates) if (value.expiresAt <= now) oauthStates.delete(key);
  }, 10 * 60 * 1000);
  cleanupTimer.unref?.();

  function currentSession(request) {
    const token = parseCookies(request)[SESSION_COOKIE];
    if (!token) return null;
    const session = sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      sessions.delete(token);
      return null;
    }
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return { token, ...session };
  }

  async function beginOAuth(response) {
    if (!config.webEnabled) {
      text(response, 503, authSetupPage(config), 'text/html; charset=utf-8');
      return;
    }
    const state = randomBytes(24).toString('hex');
    oauthStates.set(state, { expiresAt: Date.now() + OAUTH_STATE_TTL_MS });
    const redirectUri = `${config.publicBaseUrl}/auth/discord/callback`;
    const url = new URL('https://discord.com/oauth2/authorize');
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'identify guilds');
    url.searchParams.set('state', state);
    redirect(response, url.toString());
  }

  async function finishOAuth(request, response, url) {
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const savedState = state ? oauthStates.get(state) : null;
    if (!code || !savedState || savedState.expiresAt <= Date.now()) {
      text(response, 400, 'OAuth state/code is invalid or expired. Start again from /auth/discord.');
      return;
    }
    oauthStates.delete(state);

    const redirectUri = `${config.publicBaseUrl}/auth/discord/callback`;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret
    });
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text();
      console.error('OAuth token exchange failed:', detail);
      text(response, 502, 'Discord OAuth token exchange failed. Check CLIENT_ID, client secret and redirect URL.');
      return;
    }

    const token = await tokenResponse.json();
    const headers = { authorization: `Bearer ${token.access_token}` };
    const [userResponse, guildsResponse] = await Promise.all([
      fetch('https://discord.com/api/v10/users/@me', { headers }),
      fetch('https://discord.com/api/v10/users/@me/guilds', { headers })
    ]);
    if (!userResponse.ok || !guildsResponse.ok) {
      text(response, 502, 'Discord OAuth profile lookup failed.');
      return;
    }

    const user = await userResponse.json();
    const guilds = await guildsResponse.json();
    const guild = guilds.find((item) => item.id === config.guildId);
    const permissions = guild ? BigInt(guild.permissions ?? '0') : 0n;
    const allowed = Boolean(guild && (guild.owner || (permissions & MANAGE_GUILD) || (permissions & ADMINISTRATOR)));
    if (!allowed) {
      text(response, 403, 'Du skal være medlem af den konfigurerede Discord-server og have Administrer server for at bruge Web Builder.');
      return;
    }

    const sessionToken = randomBytes(32).toString('hex');
    sessions.set(sessionToken, {
      user: { id: user.id, username: user.global_name || user.username, avatar: user.avatar },
      expiresAt: Date.now() + SESSION_TTL_MS
    });
    redirect(response, '/builder', { 'set-cookie': sessionCookie(sessionToken, secureCookies) });
  }

  async function listDestinations() {
    const guild = await client.guilds.fetch(config.guildId);
    const channels = await guild.channels.fetch();
    return [...channels.values()]
      .filter((channel) => destinationTypeForChannel(channel))
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .map((channel) => {
        const type = destinationTypeForChannel(channel);
        return {
          id: channel.id,
          name: `${type === 'forum' ? 'Forum' : 'Kanal'} · ${channel.name}`,
          channelName: channel.name,
          type,
          requireTag: type === 'forum' ? channel.flags.has(1 << 4) : false,
          tags: type === 'forum' ? channel.availableTags.map((tag) => ({ id: tag.id, name: tag.name })) : []
        };
      });
  }

  async function handleApi(request, response, url, session) {
    const method = request.method || 'GET';
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && config.publicBaseUrl) {
      const origin = request.headers.origin;
      if (origin && new URL(origin).origin !== new URL(config.publicBaseUrl).origin) {
        json(response, 403, { error: 'Cross-origin write request rejected.' });
        return;
      }
    }

    if (url.pathname === '/api/bootstrap' && method === 'GET') {
      const guild = client.guilds.cache.get(config.guildId);
      json(response, 200, {
        version: VERSION,
        user: session.user,
        bot: client.user?.tag ?? null,
        guild: guild ? { id: guild.id, name: guild.name } : { id: config.guildId, name: null },
        templates: POST_TEMPLATES,
        classes: WOW_CLASSES.map((item) => ({ key: item.key, name: item.name, emojiName: item.emojiName, emojiId: item.emojiId })),
        resolutions: RESOLUTIONS.map((item) => ({ key: item.key, name: item.name })),
        profileStatus: Object.fromEntries(WOW_CLASSES.map((wowClass) => [wowClass.key, Object.fromEntries(RESOLUTIONS.map((resolution) => {
          const value = store.getProfile(wowClass.key, resolution.key);
          return [resolution.key, { exists: Boolean(value), length: value.length }];
        }))])),
        drafts: store.listDrafts().map((item) => entitySummary(item, 'd')),
        posts: store.listPosts().map((item) => entitySummary(item, 'p'))
      });
      return;
    }

    if ((url.pathname === '/api/forums' || url.pathname === '/api/destinations') && method === 'GET') {
      json(response, 200, await listDestinations());
      return;
    }

    if (url.pathname === '/api/drafts' && method === 'POST') {
      const body = await readJsonBody(request);
      const title = String(body.title ?? '').trim();
      const destinationChannelId = String(body.destinationChannelId ?? body.forumId ?? '').trim();
      const tagId = String(body.tagId ?? '').trim() || null;
      const template = String(body.template ?? 'blank');
      if (!title || title.length > 100) throw Object.assign(new Error('Titel skal være 1-100 tegn.'), { statusCode: 400 });
      const destination = await client.channels.fetch(destinationChannelId);
      const destinationType = ensureDestination(destination, tagId);
      const now = new Date().toISOString();
      const draft = {
        id: makeShortId(4),
        title,
        forumId: destination.id,
        destinationType,
        destinationChannelId: destination.id,
        appliedTagIds: destinationType === 'forum' && tagId ? [tagId] : [],
        createdBy: session.user.id,
        createdAt: now,
        updatedAt: now,
        builder: createBuilderTemplate(template, title)
      };
      await store.saveDraft(draft);
      json(response, 201, { scope: { kind: 'd', id: draft.id }, entity: draft, stats: getBuilderStats(draft, { kind: 'd', id: draft.id }) });
      return;
    }

    const entityMatch = url.pathname.match(/^\/api\/entities\/([dp])\/([^/]+)$/);
    if (entityMatch) {
      const [, kind, rawId] = entityMatch;
      const id = decodeURIComponent(rawId);
      const resolved = resolveEntity(store, kind, id);
      if (!resolved) { json(response, 404, { error: 'Opslaget blev ikke fundet.' }); return; }

      if (method === 'GET') {
        json(response, 200, {
          scope: { kind, id },
          entity: resolved.entity,
          modified: kind === 'p' ? isPostModified(resolved.entity) : true,
          stats: getBuilderStats(resolved.entity, { kind, id })
        });
        return;
      }

      if (method === 'PUT') {
        const body = await readJsonBody(request);
        const title = String(body.title ?? resolved.entity.title).trim();
        if (!title || title.length > 100) throw Object.assign(new Error('Titel skal være 1-100 tegn.'), { statusCode: 400 });
        const saved = await saveEntity(store, kind, {
          ...structuredClone(resolved.entity),
          title,
          builder: validateBuilder(body.builder ?? resolved.entity.builder)
        });
        json(response, 200, {
          scope: { kind, id },
          entity: saved,
          modified: kind === 'p' ? isPostModified(saved) : true,
          stats: getBuilderStats(saved, { kind, id })
        });
        return;
      }

      if (method === 'DELETE') {
        const deletion = kind === 'd'
          ? (await store.removeDraft(id), { ok: true, draft: true })
          : await deleteManagedPost({ client, post: resolved.entity, store });
        json(response, 200, { ok: true, ...deletion });
        return;
      }
    }

    const cloneMatch = url.pathname.match(/^\/api\/entities\/([dp])\/([^/]+)\/clone$/);
    if (cloneMatch && method === 'POST') {
      const [, kind, rawId] = cloneMatch;
      const id = decodeURIComponent(rawId);
      const resolved = resolveEntity(store, kind, id);
      if (!resolved) { json(response, 404, { error: 'Opslaget blev ikke fundet.' }); return; }
      const body = await readJsonBody(request);
      const draft = await cloneEntityToDraft(store, resolved.entity, kind, session.user.id, body.title || null);
      json(response, 201, { scope: { kind: 'd', id: draft.id }, entity: draft, stats: getBuilderStats(draft, { kind: 'd', id: draft.id }) });
      return;
    }

    const publishMatch = url.pathname.match(/^\/api\/entities\/([dp])\/([^/]+)\/publish$/);
    if (publishMatch && method === 'POST') {
      const [, kind, rawId] = publishMatch;
      const id = decodeURIComponent(rawId);
      const resolved = resolveEntity(store, kind, id);
      if (!resolved) { json(response, 404, { error: 'Opslaget blev ikke fundet.' }); return; }

      if (kind === 'd') {
        const destination = await client.channels.fetch(getDestinationChannelId(resolved.entity));
        ensureDestination(destination, resolved.entity.appliedTagIds?.[0] ?? null);
        const post = await createManagedPost({ destination, draft: resolved.entity, store });
        json(response, 200, { scope: { kind: 'p', id: post.threadId }, entity: post, modified: false, stats: getBuilderStats(post, { kind: 'p', id: post.threadId }) });
      } else {
        const post = await updateManagedPost({ client, post: resolved.entity, store });
        json(response, 200, { scope: { kind: 'p', id: post.threadId }, entity: post, modified: false, stats: getBuilderStats(post, { kind: 'p', id: post.threadId }) });
      }
      return;
    }

    const profileMatch = url.pathname.match(/^\/api\/profiles\/([a-z0-9_]+)\/([a-z0-9_]+)$/);
    if (profileMatch) {
      const [, classKey, resolutionKey] = profileMatch;
      if (!findClass(classKey) || !findResolution(resolutionKey)) {
        json(response, 404, { error: 'Ugyldig class eller opløsning.' });
        return;
      }
      if (method === 'GET') {
        const value = store.getProfile(classKey, resolutionKey);
        json(response, 200, { classKey, resolutionKey, value, length: value.length });
        return;
      }
      if (method === 'PUT') {
        const body = await readJsonBody(request, 2_000_000);
        const value = normalizeGeneratedString(String(body.value ?? ''));
        if (!value) throw Object.assign(new Error('Tekststrengen må ikke være tom.'), { statusCode: 400 });
        await store.setProfile(classKey, resolutionKey, value);
        json(response, 200, { classKey, resolutionKey, value, length: value.length });
        return;
      }
      if (method === 'DELETE') {
        await store.clearProfile(classKey, resolutionKey);
        json(response, 200, { ok: true });
        return;
      }
    }

    if (url.pathname === '/api/profile-status' && method === 'GET') {
      const values = {};
      for (const wowClass of WOW_CLASSES) {
        values[wowClass.key] = {};
        for (const resolution of RESOLUTIONS) {
          const value = store.getProfile(wowClass.key, resolution.key);
          values[wowClass.key][resolution.key] = { exists: Boolean(value), length: value.length };
        }
      }
      json(response, 200, values);
      return;
    }

    json(response, 404, { error: 'API route not found.' });
  }

  return http.createServer(async (request, response) => {
    try {
      const host = request.headers.host || 'localhost';
      const url = new URL(request.url || '/', `http://${host}`);

      if (url.pathname === '/health') {
        json(response, client.isReady() ? 200 : 503, {
          ok: client.isReady(),
          version: VERSION,
          bot: client.user?.tag ?? null,
          webBuilder: config.webEnabled,
          oauthLoginPath: '/auth/discord',
          builderPath: '/builder',
          supportedDestinations: ['forum', 'text', 'announcement'],
          uptimeSeconds: Math.floor(process.uptime())
        });
        return;
      }

      if (url.pathname === '/app.css') { await serveFile(response, 'app.css', 'text/css; charset=utf-8'); return; }
      if (url.pathname === '/app.js') { await serveFile(response, 'app.js', 'text/javascript; charset=utf-8'); return; }
      if (url.pathname === '/auth/discord') { await beginOAuth(response); return; }
      if (url.pathname === '/auth/discord/callback') { await finishOAuth(request, response, url); return; }

      if (url.pathname === '/logout') {
        const session = currentSession(request);
        if (session) sessions.delete(session.token);
        redirect(response, '/', { 'set-cookie': clearSessionCookie(secureCookies) });
        return;
      }

      if (url.pathname === '/') {
        if (!config.webEnabled) {
          text(response, 200, authSetupPage(config), 'text/html; charset=utf-8');
          return;
        }
        redirect(response, currentSession(request) ? '/builder' : '/auth/discord');
        return;
      }

      if (url.pathname === '/builder') {
        const session = currentSession(request);
        if (!session) { redirect(response, '/auth/discord'); return; }
        await serveFile(response, 'index.html', 'text/html; charset=utf-8');
        return;
      }

      if (url.pathname.startsWith('/api/')) {
        const session = currentSession(request);
        if (!session) { json(response, 401, { error: 'Not authenticated.' }); return; }
        await handleApi(request, response, url, session);
        return;
      }

      text(response, 404, 'Not found');
    } catch (error) {
      console.error('Web request error:', error);
      const status = Number(error?.statusCode) || 500;
      if (!response.headersSent) json(response, status, { error: error.message || 'Internal server error.' });
      else response.end();
    }
  });
}
