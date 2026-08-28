import fs from 'node:fs/promises';
import path from 'node:path';
import { RESOLUTIONS, WOW_CLASSES } from './constants.js';
import { migrateLegacyPostToBuilder } from './builder/templates.js';

const CURRENT_VERSION = 3;

function createDefaultProfiles() {
  const profiles = {};
  for (const wowClass of WOW_CLASSES) {
    profiles[wowClass.key] = {};
    for (const resolution of RESOLUTIONS) {
      profiles[wowClass.key][resolution.key] = '';
    }
  }
  return profiles;
}

function createDefaultData() {
  return {
    version: CURRENT_VERSION,
    profiles: createDefaultProfiles(),
    posts: {},
    drafts: {}
  };
}

function migrateCleanBaseline(source) {
  const migrated = {
    version: 1,
    profiles: createDefaultProfiles(),
    posts: {},
    drafts: {}
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

  const profileKeys = Object.keys(data.profiles ?? {});
  const cleanBaselineShape = profileKeys.some((key) => key.includes(':'));
  if (cleanBaselineShape) return migrateCleanBaseline(data);

  return data;
}

function migratePublishedState(post, builder) {
  const publishedBuilder = post?.publishedBuilder?.blocks && post?.publishedBuilder?.actions
    ? post.publishedBuilder
    : structuredClone(builder);

  return {
    ...post,
    builder,
    publishedBuilder,
    publishedTitle: post?.publishedTitle || post?.title || 'Information',
    publishedAt: post?.publishedAt || post?.updatedAt || post?.createdAt || new Date(0).toISOString()
  };
}

function mergeDefaults(data) {
  const defaults = createDefaultData();
  const source = normalizeSource(data);
  const merged = {
    ...defaults,
    ...source,
    version: CURRENT_VERSION,
    profiles: {
      ...defaults.profiles,
      ...(source.profiles ?? {})
    },
    posts: source.posts && typeof source.posts === 'object' ? source.posts : {},
    drafts: source.drafts && typeof source.drafts === 'object' ? source.drafts : {}
  };

  for (const wowClass of WOW_CLASSES) {
    merged.profiles[wowClass.key] = {
      ...defaults.profiles[wowClass.key],
      ...(merged.profiles[wowClass.key] ?? {})
    };
  }

  for (const [threadId, post] of Object.entries(merged.posts)) {
    if (!post || typeof post !== 'object') continue;
    const builder = migrateLegacyPostToBuilder(post);
    merged.posts[threadId] = migratePublishedState({
      ...post,
      threadId: post.threadId || threadId
    }, builder);
  }

  return merged;
}

function sortByTitle(items) {
  return items.sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? ''), 'da'));
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
      const cleanBaselineShape = Object.keys(parsed?.profiles ?? {}).some((key) => key.includes(':'));
      this.data = mergeDefaults(parsed);
      if (previousVersion !== CURRENT_VERSION || cleanBaselineShape || this.#needsPersistence(parsed)) {
        await this.save();
      }
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
        throw new AggregateError(
          [error, backupError],
          'Neither the primary data file nor its backup could be loaded.'
        );
      }
    }
  }

  #needsPersistence(parsed) {
    return Object.values(parsed?.posts ?? {}).some((post) =>
      !post?.builder || !post?.publishedBuilder || !post?.publishedTitle
    );
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

  getPost(threadId) {
    return this.data.posts[threadId] ?? null;
  }

  listPosts() {
    return sortByTitle(Object.values(this.data.posts));
  }

  async savePost(post) {
    if (!post?.threadId) throw new Error('Published posts require threadId.');
    this.data.posts[post.threadId] = structuredClone(post);
    await this.save();
  }

  async removePost(threadId) {
    delete this.data.posts[threadId];
    await this.save();
  }

  getDraft(draftId) {
    return this.data.drafts[draftId] ?? null;
  }

  listDrafts() {
    return sortByTitle(Object.values(this.data.drafts));
  }

  async saveDraft(draft) {
    if (!draft?.id) throw new Error('Drafts require an id.');
    this.data.drafts[draft.id] = structuredClone(draft);
    await this.save();
  }

  async removeDraft(draftId) {
    delete this.data.drafts[draftId];
    await this.save();
  }
}
