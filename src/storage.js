import fs from 'node:fs/promises';
import path from 'node:path';
import { RESOLUTIONS, WOW_CLASSES } from './constants.js';
import { migrateLegacyPostToBuilder } from './builder/templates.js';
import { BUILDER_SCHEMA_VERSION, normalizeBuilderStructure } from './builder/schema.js';

const CURRENT_VERSION = 5;
const MAX_REVISIONS = 30;
const MAX_REVISION_STORAGE_BYTES = 20_000_000;

function createDefaultProfiles() {
  const profiles = {};
  for (const wowClass of WOW_CLASSES) {
    profiles[wowClass.key] = {};
    for (const resolution of RESOLUTIONS) profiles[wowClass.key][resolution.key] = '';
  }
  return profiles;
}

function createDefaultData() {
  return {
    version: CURRENT_VERSION,
    profiles: createDefaultProfiles(),
    posts: {},
    drafts: {},
    revisions: {}
  };
}

function isCleanBaselineShape(source) {
  const profileKeys = Object.keys(source?.profiles ?? {});
  if (profileKeys.some((key) => key.includes(':'))) return true;
  return Object.values(source?.posts ?? {}).some((post) =>
    post && typeof post === 'object' && (
      'forumTitle' in post || 'forumId' in post || ('heading' in post && !post.builder)
    )
  );
}

function migrateCleanBaseline(source) {
  const migrated = {
    version: 1,
    profiles: createDefaultProfiles(),
    posts: {},
    drafts: {},
    revisions: {}
  };

  for (const [key, rawValue] of Object.entries(source?.profiles ?? {})) {
    const [classKey, resolutionKey] = String(key).split(':');
    if (!migrated.profiles[classKey] || !(resolutionKey in migrated.profiles[classKey])) continue;
    const value = typeof rawValue === 'string' ? rawValue : rawValue?.text;
    if (typeof value === 'string') migrated.profiles[classKey][resolutionKey] = value;
  }

  for (const [threadId, rawPost] of Object.entries(source?.posts ?? {})) {
    if (!rawPost || typeof rawPost !== 'object') continue;
    const title = rawPost.title || rawPost.forumTitle || rawPost.heading || 'Information';
    migrated.posts[threadId] = {
      ...rawPost,
      title,
      threadId: rawPost.threadId || threadId,
      forumChannelId: rawPost.forumChannelId || rawPost.forumId || null,
      appliedTagIds: Array.isArray(rawPost.appliedTagIds) ? rawPost.appliedTagIds : [],
      continuationMessageIds: Array.isArray(rawPost.continuationMessageIds) ? rawPost.continuationMessageIds : [],
      accentColor: Number.isInteger(rawPost.accentColor)
        ? rawPost.accentColor
        : Number.isInteger(rawPost.color)
          ? rawPost.color
          : undefined
    };
  }
  return migrated;
}

function normalizeSource(data) {
  if (!data || typeof data !== 'object') return {};
  return isCleanBaselineShape(data) ? migrateCleanBaseline(data) : data;
}

function defaultDiscordState() {
  return { status: 'unknown', reason: null, checkedAt: null };
}

function normalizeStoredEntity(entity) {
  const next = structuredClone(entity);
  if (next?.builder?.blocks && next?.builder?.actions) {
    next.builder = normalizeBuilderStructure(next.builder, { preserveLegacyAppearance: true });
  }
  if (next?.publishedBuilder?.blocks && next?.publishedBuilder?.actions) {
    next.publishedBuilder = normalizeBuilderStructure(next.publishedBuilder, { preserveLegacyAppearance: true });
  }
  return next;
}

function migratePublishedState(post, builder, builderId) {
  const publishedBuilder = post?.publishedBuilder?.blocks && post?.publishedBuilder?.actions
    ? normalizeBuilderStructure(post.publishedBuilder, { preserveLegacyAppearance: true })
    : structuredClone(builder);
  const currentDiscordId = post?.postId || post?.threadId || post?.starterMessageId || null;

  return normalizeStoredEntity({
    ...post,
    builderId,
    postId: currentDiscordId,
    threadId: post?.threadId || currentDiscordId,
    builder,
    publishedBuilder,
    publishedTitle: post?.publishedTitle || post?.title || 'Information',
    publishedAt: post?.publishedAt || post?.updatedAt || post?.createdAt || new Date(0).toISOString(),
    discordState: {
      ...defaultDiscordState(),
      ...(post?.discordState ?? {})
    },
    continuationMessageIds: Array.isArray(post?.continuationMessageIds) ? post.continuationMessageIds : [],
    appliedTagIds: Array.isArray(post?.appliedTagIds) ? post.appliedTagIds : []
  });
}

function normalizeRevisions(revisions) {
  const next = {};
  for (const [key, list] of Object.entries(revisions && typeof revisions === 'object' ? revisions : {})) {
    next[key] = compactRevisionHistory((Array.isArray(list) ? list : []).map((revision) => {
      const copy = structuredClone(revision);
      if (copy?.snapshot?.builder?.blocks && copy?.snapshot?.builder?.actions) {
        copy.snapshot.builder = normalizeBuilderStructure(copy.snapshot.builder, { preserveLegacyAppearance: true });
      }
      return copy;
    }));
  }
  return next;
}

export function compactRevisionHistory(revisions) {
  const compact = [];
  let totalBytes = 0;
  for (const revision of revisions.slice(0, MAX_REVISIONS)) {
    const bytes = Buffer.byteLength(JSON.stringify(revision), 'utf8');
    if (compact.length && totalBytes + bytes > MAX_REVISION_STORAGE_BYTES) break;
    compact.push(revision);
    totalBytes += bytes;
    if (totalBytes >= MAX_REVISION_STORAGE_BYTES) break;
  }
  return compact;
}

function mergeDefaults(data) {
  const defaults = createDefaultData();
  const source = normalizeSource(data);
  const merged = {
    ...defaults,
    ...source,
    version: CURRENT_VERSION,
    profiles: { ...defaults.profiles, ...(source.profiles ?? {}) },
    posts: {},
    drafts: source.drafts && typeof source.drafts === 'object' ? source.drafts : {},
    revisions: normalizeRevisions(source.revisions)
  };

  for (const wowClass of WOW_CLASSES) {
    merged.profiles[wowClass.key] = {
      ...defaults.profiles[wowClass.key],
      ...(merged.profiles[wowClass.key] ?? {})
    };
  }

  for (const [legacyKey, post] of Object.entries(source.posts ?? {})) {
    if (!post || typeof post !== 'object') continue;
    const builder = migrateLegacyPostToBuilder(post);
    const builderId = String(post.builderId || post.entityId || legacyKey);
    merged.posts[builderId] = migratePublishedState(post, builder, builderId);
  }

  for (const [draftId, draft] of Object.entries(merged.drafts)) {
    if (!draft || typeof draft !== 'object') continue;
    const normalized = normalizeStoredEntity(draft);
    normalized.id = normalized.id || draftId;
    normalized.appliedTagIds = Array.isArray(normalized.appliedTagIds) ? normalized.appliedTagIds : [];
    merged.drafts[draftId] = normalized;
  }

  return merged;
}

function sortByTitle(items) {
  return items.sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? ''), 'da'));
}

function revisionKey(kind, id) {
  return `${kind}:${id}`;
}

function revisionPayload(entity) {
  return {
    title: entity?.title ?? 'Information',
    builder: structuredClone(entity?.builder ?? null),
    destinationType: entity?.destinationType ?? null,
    destinationChannelId: entity?.destinationChannelId ?? null,
    forumId: entity?.forumId ?? null,
    forumChannelId: entity?.forumChannelId ?? null,
    appliedTagIds: [...(entity?.appliedTagIds ?? [])]
  };
}

function comparableRevision(entity) {
  return JSON.stringify(revisionPayload(entity));
}

function makeRevision(entity, reason = 'save') {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    reason,
    snapshot: revisionPayload(entity)
  };
}

export class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = createDefaultData();
    this.writeQueue = Promise.resolve();
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const previousVersion = Number(parsed?.version ?? 1);
      const cleanBaselineShape = isCleanBaselineShape(parsed);
      this.data = mergeDefaults(parsed);
      if (previousVersion !== CURRENT_VERSION || cleanBaselineShape || this.#needsPersistence(parsed)) await this.save();
      return;
    } catch (error) {
      if (error?.code === 'ENOENT') {
        this.data = createDefaultData();
        await this.save();
        return;
      }

      console.warn(`Could not read ${this.filePath}; trying backup.`, error);
      try {
        const backupRaw = await fs.readFile(`${this.filePath}.bak`, 'utf8');
        this.data = mergeDefaults(JSON.parse(backupRaw));
        await this.save();
        return;
      } catch (backupError) {
        throw new AggregateError([error, backupError], 'Neither the primary data file nor its backup could be loaded.');
      }
    }
  }

  #needsPersistence(parsed) {
    if (!parsed?.revisions || Number(parsed?.version ?? 1) < CURRENT_VERSION) return true;
    if (Object.values(parsed?.drafts ?? {}).some((draft) => Number(draft?.builder?.schemaVersion ?? 1) < BUILDER_SCHEMA_VERSION)) return true;
    return Object.entries(parsed?.posts ?? {}).some(([key, post]) =>
      !post?.builder || !post?.publishedBuilder || !post?.publishedTitle || !post?.builderId || post.builderId !== key ||
      Number(post?.builder?.schemaVersion ?? 1) < BUILDER_SCHEMA_VERSION || Number(post?.publishedBuilder?.schemaVersion ?? 1) < BUILDER_SCHEMA_VERSION
    );
  }

  #postKey(idOrPost) {
    const id = typeof idOrPost === 'object'
      ? idOrPost?.builderId || idOrPost?.postId || idOrPost?.threadId || idOrPost?.starterMessageId
      : idOrPost;
    if (!id) return null;
    if (this.data.posts[id]) return id;
    for (const [key, post] of Object.entries(this.data.posts)) {
      if ([post.builderId, post.postId, post.threadId, post.starterMessageId].filter(Boolean).includes(String(id))) return key;
    }
    return null;
  }

  #recordRevision(kind, id, previous, next, reason = 'save') {
    if (!previous || comparableRevision(previous) === comparableRevision(next)) return;
    const key = revisionKey(kind, id);
    const list = this.data.revisions[key] ?? [];
    list.unshift(makeRevision(previous, reason));
    this.data.revisions[key] = compactRevisionHistory(list);
  }

  async save() {
    const snapshot = `${JSON.stringify(this.data, null, 2)}\n`;
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    const backupPath = `${this.filePath}.bak`;
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        await fs.copyFile(this.filePath, backupPath);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      await fs.writeFile(temporaryPath, snapshot, 'utf8');
      await fs.rename(temporaryPath, this.filePath);
    });
    return this.writeQueue;
  }

  getProfile(classKey, resolutionKey) {
    return this.data.profiles?.[classKey]?.[resolutionKey] ?? '';
  }

  getProfiles() {
    return structuredClone(this.data.profiles);
  }

  async setProfile(classKey, resolutionKey, value) {
    if (!this.data.profiles[classKey]) this.data.profiles[classKey] = {};
    this.data.profiles[classKey][resolutionKey] = value;
    await this.save();
  }

  async clearProfile(classKey, resolutionKey) {
    await this.setProfile(classKey, resolutionKey, '');
  }

  getPost(id) {
    const key = this.#postKey(id);
    return key ? this.data.posts[key] ?? null : null;
  }

  getPostKey(id) {
    return this.#postKey(id);
  }

  listPosts() {
    return sortByTitle(Object.values(this.data.posts));
  }

  async savePost(post, { revision = true, reason = 'save' } = {}) {
    const existingKey = this.#postKey(post);
    const builderId = String(post?.builderId || existingKey || post?.threadId || post?.postId || '');
    if (!builderId) throw new Error('Published posts require a stable builderId.');
    const previous = existingKey ? this.data.posts[existingKey] : null;
    const next = normalizeStoredEntity({ ...structuredClone(post), builderId });
    if (revision) this.#recordRevision('p', builderId, previous, next, reason);
    if (existingKey && existingKey !== builderId) delete this.data.posts[existingKey];
    this.data.posts[builderId] = next;
    await this.save();
    return structuredClone(next);
  }

  async setPostDiscordState(id, discordState) {
    const key = this.#postKey(id);
    if (!key) return null;
    const post = this.data.posts[key];
    post.discordState = { ...defaultDiscordState(), ...(post.discordState ?? {}), ...discordState };
    post.updatedAt = post.updatedAt || new Date().toISOString();
    await this.save();
    return structuredClone(post);
  }

  async removePost(id) {
    const key = this.#postKey(id) || String(id);
    delete this.data.posts[key];
    delete this.data.revisions[revisionKey('p', key)];
    await this.save();
  }

  getDraft(draftId) {
    return this.data.drafts[draftId] ?? null;
  }

  listDrafts() {
    return sortByTitle(Object.values(this.data.drafts));
  }

  async saveDraft(draft, { revision = true, reason = 'save' } = {}) {
    if (!draft?.id) throw new Error('Drafts require an id.');
    const previous = this.data.drafts[draft.id] ?? null;
    const next = normalizeStoredEntity(draft);
    if (revision) this.#recordRevision('d', draft.id, previous, next, reason);
    this.data.drafts[draft.id] = next;
    await this.save();
    return structuredClone(next);
  }

  async removeDraft(draftId) {
    delete this.data.drafts[draftId];
    delete this.data.revisions[revisionKey('d', draftId)];
    await this.save();
  }

  listRevisions(kind, id) {
    const stableId = kind === 'p' ? this.#postKey(id) || id : id;
    return structuredClone(this.data.revisions[revisionKey(kind, stableId)] ?? []);
  }

  async restoreRevision(kind, id, revisionId) {
    const stableId = kind === 'p' ? this.#postKey(id) || id : id;
    const revisions = this.data.revisions[revisionKey(kind, stableId)] ?? [];
    const revision = revisions.find((item) => item.id === revisionId);
    if (!revision) throw new Error('Revisionen blev ikke fundet.');
    const current = kind === 'p' ? this.getPost(stableId) : this.getDraft(stableId);
    if (!current) throw new Error('Opslaget findes ikke længere.');
    const restored = normalizeStoredEntity({
      ...structuredClone(current),
      ...structuredClone(revision.snapshot),
      updatedAt: new Date().toISOString()
    });
    if (kind === 'p') return this.savePost(restored, { revision: true, reason: `restore:${revisionId}` });
    return this.saveDraft(restored, { revision: true, reason: `restore:${revisionId}` });
  }
}
