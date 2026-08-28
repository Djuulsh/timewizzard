import { ChannelType } from 'discord.js';
import { buildInfoMessage } from './render.js';

export async function createPost(client, storage, forumId, postData) {
  const forum = await client.channels.fetch(forumId);
  if (!forum || forum.type !== ChannelType.GuildForum) {
    throw new Error('Selected channel is not a Discord forum channel.');
  }

  const thread = await forum.threads.create({
    name: postData.forumTitle,
    message: buildInfoMessage(postData),
    reason: 'Created through Timewizzard Info Bot'
  });

  const starter = await thread.fetchStarterMessage();
  const record = {
    ...postData,
    forumId,
    threadId: thread.id,
    starterMessageId: starter?.id ?? null,
    createdAt: new Date().toISOString()
  };

  await storage.upsertPost(record);
  return record;
}

export async function updatePost(client, storage, record) {
  const thread = await client.channels.fetch(record.threadId);
  if (!thread?.isThread()) throw new Error('Forum thread could not be found.');

  if (thread.archived) await thread.setArchived(false, 'Updating bot-managed information post');
  if (record.forumTitle && thread.name !== record.forumTitle) {
    await thread.setName(record.forumTitle, 'Updating bot-managed information post');
  }

  const starter = await thread.fetchStarterMessage();
  if (!starter) throw new Error('Starter message could not be found.');
  await starter.edit(buildInfoMessage(record));

  await storage.upsertPost(record);
  return record;
}

export async function deletePost(client, storage, threadId) {
  const thread = await client.channels.fetch(threadId).catch(() => null);
  if (thread?.isThread()) {
    await thread.delete('Deleted through Timewizzard Info Bot');
  }
  await storage.deletePost(threadId);
}
