import { MessageFlags } from 'discord.js';

function getEntity(store, kind, id) {
  if (kind === 'd') return store.getDraft(id);
  if (kind === 'p') return store.getPost(id);
  return null;
}

function nestedComponents(action, context = {}) {
  const children = action.children ?? [];
  if (!children.length || !context.kind || !context.id) return [];

  if (action.presentation === 'select') {
    return [{
      type: 1,
      components: [{
        type: 3,
        custom_id: `info_nested_select:${context.kind}:${context.id}:${action.id}`,
        placeholder: action.placeholder || 'Vælg næste trin…',
        min_values: 1,
        max_values: 1,
        options: children.map((child) => ({
          label: String(child.label).slice(0, 100),
          value: `action:${child.actionId}`,
          ...(child.description ? { description: String(child.description).slice(0, 100) } : {})
        }))
      }]
    }];
  }

  return [{
    type: 1,
    components: children.slice(0, 5).map((child) => ({
      type: 2,
      style: 2,
      label: String(child.label).slice(0, 80),
      custom_id: `info_action:${context.kind}:${context.id}:${child.actionId}`
    }))
  }];
}

function ephemeralTextPayload(action, context) {
  const heading = action.title ? `## ${action.title}\n` : '';
  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
    components: [{
      type: 17,
      components: [
        { type: 10, content: `${heading}${action.content}` },
        ...nestedComponents(action, context)
      ]
    }]
  };
}

function actionRoots(entity, blockId = null) {
  const blocks = blockId ? entity.builder.blocks.filter((block) => block.id === blockId) : entity.builder.blocks;
  const roots = [];
  for (const block of blocks) {
    if (block.actionId) roots.push(block.actionId);
    for (const option of block.options ?? []) if (option.actionId) roots.push(option.actionId);
  }
  return roots;
}

function reachableAction(actions, roots, targetId) {
  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (id === targetId) return true;
    for (const child of actions[id]?.children ?? []) stack.push(child.actionId);
  }
  return false;
}

export function resolveBuilderEntity(store, kind, id) {
  return getEntity(store, kind, id);
}

export function resolveGenericAction(store, kind, id, actionId, blockId = null) {
  const entity = getEntity(store, kind, id);
  if (!entity?.builder) return null;
  const action = entity.builder.actions?.[actionId];
  if (!action) return null;
  const permitted = reachableAction(entity.builder.actions, actionRoots(entity, blockId), actionId);
  if (!permitted) return null;
  return { entity, action };
}

export function buildGenericActionReply(action, context = {}) {
  if (action.type !== 'ephemeral_text') throw new Error(`Ukendt action-type: ${action.type}`);
  return ephemeralTextPayload(action, context);
}
