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
  const source = data && typeof data === 'object' ? data : {};
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

  // v1/v2 -> v3 migration:
  // - keep every existing post/profile/draft
  // - ensure every post has the generic builder definition
  // - snapshot the last known published state so v1.1.1 can distinguish
  //   Synced from Modified without changing anything on Discord.
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
      this.data = mergeDefaults(parsed);
      if (previousVersion !== CURRENT_VERSION || this.#needsPersistence(parsed)) {
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
