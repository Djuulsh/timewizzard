import { MessageFlags } from 'discord.js';
import { buildBuilderPayloads } from './builder/render.js';

async function fetchManagedThread(client, threadId) {
  const channel = await client.channels.fetch(threadId);
  if (!channel?.isThread()) {
    throw new Error('Forum-posten blev ikke fundet, eller ID’et er ikke en tråd.');
  }
  return channel;
}

async function prepareThread(thread) {
  if (thread.archived) {
    await thread.setArchived(false, 'Shrouded Info Bot opdaterer opslaget');
  }
}

async function removeMessages(thread, messageIds) {
  for (const messageId of messageIds ?? []) {
    try {
      const message = await thread.messages.fetch(messageId);
      await message.delete();
    } catch (error) {
      if (error?.code !== 10008) {
        console.warn(`Could not remove continuation message ${messageId}:`, error);
      }
    }
  }
}

async function sendContinuationMessages(thread, payloads) {
  const ids = [];
  try {
    for (const payload of payloads) {
      const message = await thread.send(payload);
      ids.push(message.id);
    }
    return ids;
  } catch (error) {
    await removeMessages(thread, ids);
    throw error;
  }
}

async function replaceContinuationMessages(thread, oldMessageIds, payloads) {
  // Send the replacement set first. If Discord rejects one of them, the old
  // continuation messages remain intact and the partial new set is rolled back.
  const newIds = await sendContinuationMessages(thread, payloads);
  await removeMessages(thread, oldMessageIds);
  return newIds;
}

export async function createManagedPost({ forum, draft, store }) {
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

    const post = {
      title: draft.title,
      builder: structuredClone(draft.builder),
      publishedBuilder: structuredClone(draft.builder),
      publishedTitle: draft.title,
      publishedAt: new Date().toISOString(),
      appliedTagIds: [...(draft.appliedTagIds ?? [])],
      createdBy: draft.createdBy,
      threadId: thread.id,
      forumChannelId: forum.id,
      starterMessageId: null,
      continuationMessageIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const payloads = buildBuilderPayloads(post, { kind: 'p', id: thread.id });
    const starterMessage = await thread.fetchStarterMessage();
    if (!starterMessage) {
      throw new Error('Discord returnerede ikke forum-postens startbesked.');
    }

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
    try {
      await store.removeDraft(draft.id);
    } catch (cleanupError) {
      // The published post is already durable. Do not delete it because a draft
      // cleanup failed; log the cleanup issue and let the administrator remove
      // the stale draft later.
      console.warn(`Published ${post.threadId}, but could not remove draft ${draft.id}:`, cleanupError);
    }
    return post;
  } catch (error) {
    if (thread) {
      await thread.delete('Rydder op efter mislykket oprettelse').catch(() => undefined);
    }
    throw error;
  }
}

export async function updateManagedPost({ client, post, store }) {
  const thread = await fetchManagedThread(client, post.threadId);
  await prepareThread(thread);

  if (thread.name !== post.title) {
    await thread.setName(post.title, 'Informationsopslag redigeret');
  }

  const payloads = buildBuilderPayloads(post, { kind: 'p', id: post.threadId });
  const starterMessage = await thread.fetchStarterMessage();
  if (!starterMessage) {
    throw new Error('Forum-postens startbesked kunne ikke hentes.');
  }

  await starterMessage.edit({
    content: null,
    embeds: [],
    components: payloads[0].components,
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] }
  });

  const continuationMessageIds = await replaceContinuationMessages(
    thread,
    post.continuationMessageIds,
    payloads.slice(1)
  );

  const updatedPost = {
    ...post,
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

export async function deleteManagedPost({ client, post, store }) {
  const thread = await fetchManagedThread(client, post.threadId);
  await thread.delete('Informationsopslag slettet via Shrouded Post Builder');
  await store.removePost(post.threadId);
}
