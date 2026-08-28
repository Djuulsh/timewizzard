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
  if (thread.archived) {
    await thread.setArchived(false, 'Timewizzard opdaterer opslaget');
  }
}

async function removeMessages(target, messageIds) {
  for (const messageId of messageIds ?? []) {
    try {
      const message = await target.messages.fetch(messageId);
      await message.delete();
    } catch (error) {
      if (!isGoneOrInaccessible(error)) {
        console.warn(`Could not remove managed message ${messageId}:`, error);
      }
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

function buildBasePost(draft, destination, postId) {
  const destinationType = destinationTypeForChannel(destination);
  return {
    title: draft.title,
    builder: structuredClone(draft.builder),
    publishedBuilder: structuredClone(draft.builder),
    publishedTitle: draft.title,
    publishedAt: new Date().toISOString(),
    appliedTagIds: destinationType === 'forum' ? [...(draft.appliedTagIds ?? [])] : [],
    createdBy: draft.createdBy,
    postId,
    threadId: postId,
    destinationType,
    destinationChannelId: destination.id,
    // Keep the legacy field so old builder/controller paths continue to work.
    forumChannelId: destination.id,
    starterMessageId: null,
    continuationMessageIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function createForumPost({ forum, draft, store }) {
  let thread = null;
  try {
    thread = await forum.threads.create({
      name: draft.title,
      appliedTags: draft.appliedTagIds ?? [],
      message: {
        content: 'Opretter informationspanelet…',
        allowedMentions: { parse: [] }
      },
      reason: `Informationsopslag oprettet af ${draft.createdBy}`
    });

    const post = buildBasePost(draft, forum, thread.id);
    const payloads = buildBuilderPayloads(post, { kind: 'p', id: post.postId });
    const starterMessage = await thread.fetchStarterMessage();
    if (!starterMessage) throw new Error('Discord returnerede ikke forum-postens startbesked.');

    await starterMessage.edit({
      content: null,
      embeds: [],
      components: payloads[0].components,
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] }
    });

    post.starterMessageId = starterMessage.id;
    post.continuationMessageIds = await sendContinuationMessages(thread, payloads.slice(1));
    await store.savePost(post);
    await store.removeDraft(draft.id).catch((error) => console.warn(`Could not remove draft ${draft.id}:`, error));
    return post;
  } catch (error) {
    if (thread) await thread.delete('Rydder op efter mislykket oprettelse').catch(() => undefined);
    throw error;
  }
}

async function createChannelPost({ channel, draft, store }) {
  let starterMessage = null;
  const sentIds = [];
  try {
    starterMessage = await channel.send({
      content: 'Opretter informationspanelet…',
      allowedMentions: { parse: [] }
    });
    sentIds.push(starterMessage.id);

    // For normal channels the starter message ID doubles as the stable managed-post ID.
    const post = buildBasePost(draft, channel, starterMessage.id);
    const payloads = buildBuilderPayloads(post, { kind: 'p', id: post.postId });

    await starterMessage.edit({
      content: null,
      embeds: [],
      components: payloads[0].components,
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] }
    });

    post.starterMessageId = starterMessage.id;
    post.continuationMessageIds = await sendContinuationMessages(channel, payloads.slice(1));
    sentIds.push(...post.continuationMessageIds);
    await store.savePost(post);
    await store.removeDraft(draft.id).catch((error) => console.warn(`Could not remove draft ${draft.id}:`, error));
    return post;
  } catch (error) {
    if (starterMessage) await removeMessages(channel, sentIds);
    throw error;
  }
}

export async function createManagedPost({ destination, forum, draft, store }) {
  const target = destination ?? forum;
  const type = destinationTypeForChannel(target);
  if (type === 'forum') return createForumPost({ forum: target, draft, store });
  if (type === 'channel') return createChannelPost({ channel: target, draft, store });
  throw new Error('Destinationen skal være en forum-, tekst- eller announcement-kanal.');
}

async function updateForumPost({ client, post, store }) {
  const thread = await fetchChannelOrNull(client, post.threadId);
  if (!thread?.isThread()) {
    throw new Error('Forum-posten findes ikke længere. Du kan stadig slette den fra Builder for at rydde den gemte post-reference.');
  }
  await prepareThread(thread);
  if (thread.name !== post.title) await thread.setName(post.title, 'Informationsopslag redigeret');

  const postId = getManagedPostId(post);
  const payloads = buildBuilderPayloads(post, { kind: 'p', id: postId });
  const starterMessage = await thread.fetchStarterMessage();
  if (!starterMessage) throw new Error('Forum-postens startbesked kunne ikke hentes.');

  await starterMessage.edit({
    content: null,
    embeds: [],
    components: payloads[0].components,
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] }
  });

  const continuationMessageIds = await replaceContinuationMessages(thread, post.continuationMessageIds, payloads.slice(1));
  const updatedPost = {
    ...post,
    postId,
    starterMessageId: starterMessage.id,
    continuationMessageIds,
    publishedBuilder: structuredClone(post.builder),
    publishedTitle: post.title,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await store.savePost(updatedPost);
  return updatedPost;
}

async function updateChannelPost({ client, post, store }) {
  const channel = await fetchChannelOrNull(client, getDestinationChannelId(post));
  if (!channel || destinationTypeForChannel(channel) !== 'channel') {
    throw new Error('Destination-kanalen findes ikke længere. Du kan stadig slette opslaget fra Builder for at rydde den gemte post-reference.');
  }

  const starterMessage = await channel.messages.fetch(post.starterMessageId).catch((error) => {
    if (isGoneOrInaccessible(error)) return null;
    throw error;
  });
  if (!starterMessage) {
    throw new Error('Den primære Discord-besked findes ikke længere. Slet opslaget fra Builder eller klon det til en ny kladde.');
  }

  const postId = getManagedPostId(post);
  const payloads = buildBuilderPayloads(post, { kind: 'p', id: postId });
  await starterMessage.edit({
    content: null,
    embeds: [],
    components: payloads[0].components,
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] }
  });

  const continuationMessageIds = await replaceContinuationMessages(channel, post.continuationMessageIds, payloads.slice(1));
  const updatedPost = {
    ...post,
    postId,
    continuationMessageIds,
    publishedBuilder: structuredClone(post.builder),
    publishedTitle: post.title,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await store.savePost(updatedPost);
  return updatedPost;
}

export async function updateManagedPost({ client, post, store }) {
  return getDestinationType(post) === 'channel'
    ? updateChannelPost({ client, post, store })
    : updateForumPost({ client, post, store });
}

export async function deleteManagedPost({ client, post, store }) {
  const postId = getManagedPostId(post);
  let discordDeleted = false;
  let destinationMissing = false;
  let warning = null;

  try {
    if (getDestinationType(post) === 'channel') {
      const channel = await fetchChannelOrNull(client, getDestinationChannelId(post));
      if (!channel) {
        destinationMissing = true;
      } else {
        await removeMessages(channel, [post.starterMessageId, ...(post.continuationMessageIds ?? [])]);
        discordDeleted = true;
      }
    } else {
      const thread = await fetchChannelOrNull(client, post.threadId);
      if (!thread) {
        destinationMissing = true;
      } else {
        try {
          await thread.delete('Informationsopslag slettet via Timewizzard Post Builder');
          discordDeleted = true;
        } catch (error) {
          if (isGoneOrInaccessible(error)) destinationMissing = true;
          else throw error;
        }
      }
    }
  } catch (error) {
    warning = error?.message || String(error);
    console.warn(`Could not delete Discord target for managed post ${postId}:`, error);
  } finally {
    // The Builder record must always remain removable, even when the Discord
    // channel/thread/message was deleted outside the bot or access was revoked.
    await store.removePost(postId);
  }

  return { postId, discordDeleted, destinationMissing, warning };
}
