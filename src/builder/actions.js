import { MessageFlags } from 'discord.js';

function getEntity(store, kind, id) {
  if (kind === 'd') return store.getDraft(id);
  if (kind === 'p') return store.getPost(id);
  return null;
}

function ephemeralTextPayload(action) {
  const heading = action.title ? `## ${action.title}\n` : '';
  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
    components: [{
      type: 17,
      components: [{
        type: 10,
        content: `${heading}${action.content}`
      }]
    }]
  };
}

export function resolveBuilderEntity(store, kind, id) {
  return getEntity(store, kind, id);
}

export function resolveGenericAction(store, kind, id, actionId, blockId = null) {
  const entity = getEntity(store, kind, id);
  if (!entity?.builder) return null;

  const action = entity.builder.actions?.[actionId];
  if (!action) return null;

  const permitted = blockId
    ? entity.builder.blocks.some((block) =>
        block.id === blockId &&
        (block.actionId === actionId || (block.options ?? []).some((option) => option.actionId === actionId))
      )
    : entity.builder.blocks.some((block) =>
        block.actionId === actionId || (block.options ?? []).some((option) => option.actionId === actionId)
      );

  if (!permitted) return null;
  return { entity, action };
}

export function buildGenericActionReply(action) {
  if (action.type !== 'ephemeral_text') {
    throw new Error(`Ukendt action-type: ${action.type}`);
  }
  return ephemeralTextPayload(action);
}
