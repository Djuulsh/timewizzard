import { MessageFlags } from 'discord.js';
import { buildBuilderPayloads } from './builder/render.js';
import {
  destinationTypeForChannel,
  getDestinationChannelId,
  getDestinationType,
  getManagedPostId
} from './destinations.js';

const GONE_OR_INACCESSIBLE_CODES = new Set([10003, 10008, 50001, 50013]);

function isGoneOrInaccessible(error) {
  return GONE_OR_INACCESSIBLE_CODES.has(Number(error?.code));
}

async function fetchChannelOrNull(client, channelId) {
  if (!channelId) return null;
  try {
    return await client.channels.fetch(channelId);
  } catch (error) {
    if (isGoneOrInaccessible(error)) return null;
    throw error;
  }
}

async function prepareThread(thread) {
  if (thread.archived) await thread.setArchived(false, 'Timewizzard opdaterer opslaget');
}

async function removeMessages(target, messageIds) {
  for (const messageId of messageIds ?? []) {
    if (!messageId) continue;
    try {
      const message = await target.messages.fetch(messageId);
      await message.delete();
    } catch (error) {
      if (!isGoneOrInaccessible(error)) console.warn(`Could not remove managed message ${messageId}:`, error);
    }
  }
}

async function sendContinuationMessages(target, payloads) {
  const ids = [];
  try {
    for (const payload of payloads) {
      const message = await target.send(payload);
      ids.push(message.id);
    }
    return ids;
  } catch (error) {
    await removeMessages(target, ids);
    throw error;
  }
}

async function replaceContinuationMessages(target, oldMessageIds, payloads) {
  const newIds = await sendContinuationMessages(target, payloads);
  await removeMessages(target, oldMessageIds);
  return newIds;
}

function liveState() {
  return { status: 'live', reason: null, checkedAt: new Date().toISOString() };
}

function mentionPolicySnapshot(source) {
  return structuredClone(source?.mentionPolicy ?? { mode: 'display', users: [], roles: [] });
}

function buildBasePost(source, destination, builderId, discordId) {
  const destinationType = destinationTypeForChannel(destination);
  return {
    ...source,
    title: source.title,
    builderId,
    builder: structuredClone(source.builder),
    publishedBuilder: structuredClone(source.builder),
    publishedMentionPolicy: mentionPolicySnapshot(source),
    publishedTitle: source.title,
    publishedAt: new Date().toISOString(),
    appliedTagIds: destinationType === 'forum' ? [...(source.appliedTagIds ?? [])] : [],
    createdBy: source.createdBy,
    postId: discordId,
    threadId: discordId,
    destinationType,
    destinationChannelId: destination.id,
    forumChannelId: destination.id,
    starterMessageId: null,
    continuationMessageIds: [],
    createdAt: source.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    discordState: liveState()
  };
}

async function publishForum({ forum, source, store, builderId, removeDraftId = null, reason = 'publish' }) {
  let thread = null;
  try {
    thread = await forum.threads.create({
      name: source.title,
      appliedTags: source.appliedTagIds ?? [],
      message: { content: 'Opretter informationspanelet…', allowedMentions: { parse: [] } },
      reason: `Informationsopslag oprettet af ${source.createdBy || 'Timewizzard'}`
    });

    const post = buildBasePost(source, forum, builderId, thread.id);
    const payloads = buildBuilderPayloads(post, { kind: 'p', id: builderId });
    const starterMessage = await thread.fetchStarterMessage();
    if (!starterMessage) throw new Error('Discord returnerede ikke forum-postens startbesked.');

    await starterMessage.edit({
      content: null,
      embeds: [],
      components: payloads[0].components,
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: payloads[0].allowedMentions
    });

    post.starterMessageId = starterMessage.id;
    post.continuationMessageIds = await sendContinuationMessages(thread, payloads.slice(1));
    const saved = await store.savePost(post, { revision: true, reason });
    if (removeDraftId) await store.removeDraft(removeDraftId).catch((error) => console.warn(`Could not remove draft ${removeDraftId}:`, error));
    return saved;
  } catch (error) {
    if (thread) await thread.delete('Rydder op efter mislykket oprettelse').catch(() => undefined);
    throw error;
  }
}

async function publishChannel({ channel, source, store, builderId, removeDraftId = null, reason = 'publish' }) {
  let starterMessage = null;
  const sentIds = [];
  try {
    if (channel.isThread?.()) await prepareThread(channel);
    starterMessage = await channel.send({ content: 'Opretter informationspanelet…', allowedMentions: { parse: [] } });
    sentIds.push(starterMessage.id);

    const post = buildBasePost(source, channel, builderId, starterMessage.id);
    const payloads = buildBuilderPayloads(post, { kind: 'p', id: builderId });
    await starterMessage.edit({
      content: null,
      embeds: [],
      components: payloads[0].components,
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: payloads[0].allowedMentions
    });

    post.starterMessageId = starterMessage.id;
    post.continuationMessageIds = await sendContinuationMessages(channel, payloads.slice(1));
    sentIds.push(...post.continuationMessageIds);
    const saved = await store.savePost(post, { revision: true, reason });
    if (removeDraftId) await store.removeDraft(removeDraftId).catch((error) => console.warn(`Could not remove draft ${removeDraftId}:`, error));
    return saved;
  } catch (error) {
    if (starterMessage) await removeMessages(channel, sentIds);
    throw error;
  }
}

async function publishToDestination({ destination, source, store, builderId, removeDraftId = null, reason = 'publish' }) {
  const type = destinationTypeForChannel(destination);
  if (type === 'forum') return publishForum({ forum: destination, source, store, builderId, removeDraftId, reason });
  if (type === 'channel' || type === 'thread') return publishChannel({ channel: destination, source, store, builderId, removeDraftId, reason });
  throw new Error('Choose a forum, existing forum post, text channel or announcement channel.');
}

export async function createManagedPost({ destination, forum, draft, store }) {
  const target = destination ?? forum;
  const builderId = String(draft.builderId || draft.id || getManagedPostId(draft));
  if (!builderId) throw new Error('Kladde mangler et stabilt Builder-ID.');
  return publishToDestination({ destination: target, source: draft, store, builderId, removeDraftId: draft.id, reason: 'publish' });
}

async function updateForumPost({ client, post, store }) {
  const thread = await fetchChannelOrNull(client, post.threadId);
  if (!thread?.isThread()) {
    await store.setPostDiscordState(post.builderId || post.threadId, {
      status: 'deleted', reason: 'thread_missing', checkedAt: new Date().toISOString()
    });
    throw new Error('Forum-posten findes ikke længere. Builder-data er bevaret; brug Re-create for at publicere den igen.');
  }
  await prepareThread(thread);
  if (thread.name !== post.title) await thread.setName(post.title, 'Informationsopslag redigeret');

  const builderId = String(post.builderId || post.threadId);
  const payloads = buildBuilderPayloads(post, { kind: 'p', id: builderId });
  const starterMessage = await thread.fetchStarterMessage().catch(() => null);
  if (!starterMessage) {
    await store.setPostDiscordState(builderId, {
      status: 'deleted', reason: 'message_missing', checkedAt: new Date().toISOString()
    });
    throw new Error('Forum-postens startbesked mangler. Builder-data er bevaret; brug Re-create.');
  }

  await starterMessage.edit({
    content: null,
    embeds: [],
    components: payloads[0].components,
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: payloads[0].allowedMentions
  });

  const continuationMessageIds = await replaceContinuationMessages(thread, post.continuationMessageIds, payloads.slice(1));
  const updatedPost = {
    ...post,
    builderId,
    starterMessageId: starterMessage.id,
    continuationMessageIds,
    publishedBuilder: structuredClone(post.builder),
    publishedMentionPolicy: mentionPolicySnapshot(post),
    publishedTitle: post.title,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    discordState: liveState()
  };
  return store.savePost(updatedPost, { revision: true, reason: 'publish-update' });
}

async function updateChannelPost({ client, post, store }) {
  const builderId = String(post.builderId || post.threadId);
  const channel = await fetchChannelOrNull(client, getDestinationChannelId(post));
  if (!channel || !['channel', 'thread'].includes(destinationTypeForChannel(channel))) {
    await store.setPostDiscordState(builderId, {
      status: 'deleted', reason: 'destination_missing', checkedAt: new Date().toISOString()
    });
    throw new Error('Destination-kanalen findes ikke længere. Builder-data er bevaret; vælg en ny destination og brug Re-create.');
  }

  if (channel.isThread?.()) await prepareThread(channel);

  const starterMessage = await channel.messages.fetch(post.starterMessageId).catch((error) => {
    if (isGoneOrInaccessible(error)) return null;
    throw error;
  });
  if (!starterMessage) {
    await store.setPostDiscordState(builderId, {
      status: 'deleted', reason: 'message_missing', checkedAt: new Date().toISOString()
    });
    throw new Error('Den primære Discord-besked findes ikke længere. Builder-data er bevaret; brug Re-create.');
  }

  const payloads = buildBuilderPayloads(post, { kind: 'p', id: builderId });
  await starterMessage.edit({
    content: null,
    embeds: [],
    components: payloads[0].components,
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: payloads[0].allowedMentions
  });

  const continuationMessageIds = await replaceContinuationMessages(channel, post.continuationMessageIds, payloads.slice(1));
  const updatedPost = {
    ...post,
    builderId,
    continuationMessageIds,
    publishedBuilder: structuredClone(post.builder),
    publishedMentionPolicy: mentionPolicySnapshot(post),
    publishedTitle: post.title,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    discordState: liveState()
  };
  return store.savePost(updatedPost, { revision: true, reason: 'publish-update' });
}

export async function updateManagedPost({ client, post, store }) {
  return getDestinationType(post) === 'forum'
    ? updateForumPost({ client, post, store })
    : updateChannelPost({ client, post, store });
}

export async function inspectManagedPost({ client, post }) {
  const checkedAt = new Date().toISOString();
  const destination = await fetchChannelOrNull(client, getDestinationChannelId(post));
  if (!destination) return { status: 'deleted', reason: 'destination_missing', destinationExists: false, targetExists: false, checkedAt };

  if (getDestinationType(post) === 'forum') {
    const thread = await fetchChannelOrNull(client, post.threadId);
    if (!thread?.isThread()) return { status: 'deleted', reason: 'thread_missing', destinationExists: true, targetExists: false, checkedAt };
    const starter = await thread.fetchStarterMessage().catch(() => null);
    if (!starter) return { status: 'deleted', reason: 'message_missing', destinationExists: true, targetExists: false, checkedAt };
    return { status: 'live', reason: null, destinationExists: true, targetExists: true, checkedAt };
  }

  const starter = post.starterMessageId
    ? await destination.messages.fetch(post.starterMessageId).catch((error) => {
        if (isGoneOrInaccessible(error)) return null;
        throw error;
      })
    : null;
  if (!starter) return { status: 'deleted', reason: 'message_missing', destinationExists: true, targetExists: false, checkedAt };
  return { status: 'live', reason: null, destinationExists: true, targetExists: true, checkedAt };
}

export async function refreshManagedPostState({ client, post, store }) {
  const state = await inspectManagedPost({ client, post });
  const current = post.discordState ?? {};
  if (current.status !== state.status || current.reason !== state.reason) {
    return store.setPostDiscordState(post.builderId || post.threadId, state);
  }
  return { ...post, discordState: state };
}

async function deleteDiscordTargetOnly({ client, post }) {
  if (getDestinationType(post) !== 'forum') {
    const channel = await fetchChannelOrNull(client, getDestinationChannelId(post));
    if (!channel) return false;
    await removeMessages(channel, [post.starterMessageId, ...(post.continuationMessageIds ?? [])]);
    return true;
  }

  const thread = await fetchChannelOrNull(client, post.threadId);
  if (!thread) return false;
  try {
    await thread.delete('Informationsopslag flyttet eller slettet via Timewizzard');
    return true;
  } catch (error) {
    if (isGoneOrInaccessible(error)) return false;
    throw error;
  }
}

export async function recreateManagedPost({ client, post, store, destination = null, tagIds = undefined, removeOld = true }) {
  const builderId = String(post.builderId || store.getPostKey?.(post) || post.threadId);
  let target = destination;
  if (!target) target = await fetchChannelOrNull(client, getDestinationChannelId(post));
  if (!target) throw new Error('Den tidligere destination findes ikke længere. Vælg en ny destination før Re-create.');

  const type = destinationTypeForChannel(target);
  if (!type) throw new Error('Den nye destination er ikke understøttet.');
  const source = {
    ...structuredClone(post),
    builderId,
    appliedTagIds: type === 'forum'
      ? tagIds !== undefined
        ? [...tagIds]
        : [...(post.appliedTagIds ?? [])]
      : []
  };
  delete source.pendingDestination;

  const oldTarget = structuredClone(post);
  const recreated = await publishToDestination({
    destination: target,
    source,
    store,
    builderId,
    removeDraftId: null,
    reason: 're-create'
  });

  if (removeOld) {
    const sameDiscordTarget = getManagedPostId(oldTarget) && getManagedPostId(oldTarget) === getManagedPostId(recreated);
    if (!sameDiscordTarget) await deleteDiscordTargetOnly({ client, post: oldTarget }).catch((error) => console.warn('Could not clean old Discord target after re-create:', error));
  }
  return recreated;
}

export async function deleteManagedPost({ client, post, store }) {
  const builderId = String(post.builderId || store.getPostKey?.(post) || post.threadId);
  let discordDeleted = false;
  let destinationMissing = false;
  let warning = null;
  try {
    discordDeleted = await deleteDiscordTargetOnly({ client, post });
    destinationMissing = !discordDeleted;
  } catch (error) {
    warning = error?.message || String(error);
    console.warn(`Could not delete Discord target for managed post ${builderId}:`, error);
  } finally {
    await store.removePost(builderId);
  }
  return { postId: builderId, discordDeleted, destinationMissing, warning };
}
