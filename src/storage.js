import fs from 'node:fs/promises';
import path from 'node:path';

const EMPTY = { version: 1, profiles: {}, posts: {} };

export class Storage {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'store.json');
    this.backupPath = path.join(dataDir, 'store.json.bak');
    this.data = structuredClone(EMPTY);
    this.writeQueue = Promise.resolve();
  }

  async init() {
    await fs.mkdir(this.dataDir, { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.data = {
        version: 1,
        profiles: parsed.profiles ?? {},
        posts: parsed.posts ?? {}
      };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.save();
    }
  }

  profileKey(classKey, resolutionKey) {
    return `${classKey}:${resolutionKey}`;
  }

  getProfile(classKey, resolutionKey) {
    return this.data.profiles[this.profileKey(classKey, resolutionKey)] ?? null;
  }

  async setProfile(classKey, resolutionKey, text) {
    this.data.profiles[this.profileKey(classKey, resolutionKey)] = {
      text,
      updatedAt: new Date().toISOString()
    };
    await this.save();
  }

  async deleteProfile(classKey, resolutionKey) {
    delete this.data.profiles[this.profileKey(classKey, resolutionKey)];
    await this.save();
  }

  listProfiles() {
    return structuredClone(this.data.profiles);
  }

  getPost(threadId) {
    return this.data.posts[threadId] ? structuredClone(this.data.posts[threadId]) : null;
  }

  listPosts() {
    return Object.values(this.data.posts)
      .map((post) => structuredClone(post))
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  async upsertPost(post) {
    this.data.posts[post.threadId] = {
      ...post,
      updatedAt: new Date().toISOString()
    };
    await this.save();
  }

  async deletePost(threadId) {
    delete this.data.posts[threadId];
    await this.save();
  }

  async save() {
    this.writeQueue = this.writeQueue.then(async () => {
      const tempPath = `${this.filePath}.tmp`;
      const json = JSON.stringify(this.data, null, 2);

      try {
        await fs.copyFile(this.filePath, this.backupPath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }

      await fs.writeFile(tempPath, json, 'utf8');
      await fs.rename(tempPath, this.filePath);
    });

    return this.writeQueue;
  }
}
