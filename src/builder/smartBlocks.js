import { isPublicHttpUrl } from '../utils.js';

export const SMART_BLOCK_TYPES = Object.freeze([
  'heading',
  'callout',
  'checklist',
  'steps',
  'facts',
  'button_row',
  'event',
  'countdown',
  'code',
  'progress'
]);

const SMART_BLOCK_SET = new Set(SMART_BLOCK_TYPES);
const CALLOUT_TONES = new Set(['info', 'success', 'warning', 'danger', 'neutral']);
const TONE_ICON = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  danger: '🛑',
  neutral: '💬'
};

export function isSmartBlockType(type) {
  return SMART_BLOCK_SET.has(type);
}

function textDisplay(content) {
  return [{ type: 10, content }];
}

function asText(value) {
  return String(value ?? '').trim();
}

function headingContent(block) {
  const level = [1, 2, 3].includes(Number(block.level)) ? Number(block.level) : 2;
  const emoji = asText(block.emoji);
  const title = asText(block.title) || 'Heading';
  const subtitle = asText(block.subtitle);
  return [`${'#'.repeat(level)} ${emoji ? `${emoji} ` : ''}${title}`, subtitle].filter(Boolean).join('\n');
}

function calloutContent(block) {
  const tone = CALLOUT_TONES.has(block.tone) ? block.tone : 'info';
  const title = asText(block.title) || 'Notice';
  const content = asText(block.content);
  return [`### ${TONE_ICON[tone]} ${title}`, content].filter(Boolean).join('\n');
}

function checklistContent(block) {
  const title = asText(block.title);
  const rows = (block.items ?? []).map((item) => `${item?.checked ? '☑️' : '☐'} ${asText(item?.text)}`);
  return [title ? `### ${title}` : null, ...rows].filter(Boolean).join('\n');
}

function stepsContent(block) {
  const title = asText(block.title);
  const rows = (block.items ?? []).flatMap((item, index) => {
    const name = asText(item?.title) || `Step ${index + 1}`;
    const content = asText(item?.content);
    return [`### ${index + 1}. ${name}`, content, ''];
  });
  return [title ? `## ${title}` : null, ...rows].filter((value, index, values) => value !== null && !(value === '' && values[index + 1] === '')).join('\n').trim();
}

function factsContent(block) {
  const title = asText(block.title);
  const rows = (block.items ?? []).map((item) => {
    const label = asText(item?.label);
    const value = asText(item?.value);
    return `**${label}**\n${value}`;
  });
  return [title ? `### ${title}` : null, ...rows].filter(Boolean).join('\n');
}

function eventContent(block) {
  const title = asText(block.title) || 'Event';
  const description = asText(block.description);
  const location = asText(block.location);
  const start = Number(block.startEpoch);
  const end = Number(block.endEpoch);
  const rows = [`## 📅 ${title}`, description];
  if (Number.isInteger(start) && start > 0) rows.push(`**Starts:** <t:${start}:F> · <t:${start}:R>`);
  if (Number.isInteger(end) && end > 0) rows.push(`**Ends:** <t:${end}:F>`);
  if (location) rows.push(`**Where:** ${location}`);
  return rows.filter(Boolean).join('\n');
}

function countdownContent(block) {
  const title = asText(block.title) || 'Countdown';
  const text = asText(block.text);
  const target = Number(block.targetEpoch);
  const rows = [`## ⏳ ${title}`, text];
  if (Number.isInteger(target) && target > 0) {
    rows.push(`**<t:${target}:R>**`, `-# <t:${target}:F>`);
  }
  return rows.filter(Boolean).join('\n');
}

function codeContent(block) {
  const caption = asText(block.caption);
  const language = asText(block.language).replace(/[^A-Za-z0-9_+.-]/g, '').slice(0, 30);
  const code = String(block.code ?? '').replaceAll('```', '``\u200b`');
  return [caption, `\`\`\`${language}\n${code}\n\`\`\``].filter(Boolean).join('\n');
}

function progressContent(block) {
  const label = asText(block.label) || 'Progress';
  const current = Number(block.current);
  const total = Number(block.total);
  const segments = Number.isInteger(Number(block.segments)) ? Math.min(20, Math.max(5, Number(block.segments))) : 10;
  const ratio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
  const filled = Math.round(ratio * segments);
  const bar = `${'█'.repeat(filled)}${'░'.repeat(segments - filled)}`;
  const percent = Math.round(ratio * 100);
  const note = asText(block.note);
  const numbers = block.showNumbers === false ? `${percent}%` : `${current}/${total} · ${percent}%`;
  return [`**${label}**`, `\`${bar}\` **${numbers}**`, note].filter(Boolean).join('\n');
}

export function smartBlockToComponents(block) {
  switch (block.type) {
    case 'heading': return textDisplay(headingContent(block));
    case 'callout': return textDisplay(calloutContent(block));
    case 'checklist': return textDisplay(checklistContent(block));
    case 'steps': return textDisplay(stepsContent(block));
    case 'facts': return textDisplay(factsContent(block));
    case 'event': return textDisplay(eventContent(block));
    case 'countdown': return textDisplay(countdownContent(block));
    case 'code': return textDisplay(codeContent(block));
    case 'progress': return textDisplay(progressContent(block));
    case 'button_row':
      return [{
        type: 1,
        components: (block.buttons ?? []).map((button) => ({
          type: 2,
          style: 5,
          label: asText(button?.label).slice(0, 80),
          url: asText(button?.url)
        }))
      }];
    default:
      return null;
  }
}

function ensureGeneratedText(block, label) {
  const components = smartBlockToComponents(block) ?? [];
  for (const component of components) {
    if (component.type === 10 && (!String(component.content ?? '').trim() || String(component.content).length > 4_000)) {
      throw new Error(`${label} genererer mere end 4000 tegn eller er tomt.`);
    }
  }
}

export function validateSmartBlock(block) {
  if (!isSmartBlockType(block?.type)) return false;

  if (block.type === 'heading') {
    if (!asText(block.title) || asText(block.title).length > 200) throw new Error('Heading skal have en titel på højst 200 tegn.');
    if (asText(block.subtitle).length > 1_000) throw new Error('Heading subtitle er over 1000 tegn.');
    if (asText(block.emoji).length > 80) throw new Error('Heading emoji/prefix er for lang.');
    if (![1, 2, 3].includes(Number(block.level))) throw new Error('Heading level skal være 1, 2 eller 3.');
  }

  if (block.type === 'callout') {
    if (!CALLOUT_TONES.has(block.tone ?? 'info')) throw new Error('Callout tone er ugyldig.');
    if (!asText(block.title) || asText(block.title).length > 200) throw new Error('Callout skal have en titel på højst 200 tegn.');
    if (!asText(block.content) || asText(block.content).length > 3_000) throw new Error('Callout content skal være 1-3000 tegn.');
  }

  if (block.type === 'checklist') {
    if (!Array.isArray(block.items) || block.items.length < 1 || block.items.length > 30) throw new Error('Checklist skal have 1-30 punkter.');
    for (const item of block.items) if (!asText(item?.text) || asText(item.text).length > 250) throw new Error('Checklist-punkter skal være 1-250 tegn.');
    if (asText(block.title).length > 200) throw new Error('Checklist title er over 200 tegn.');
  }

  if (block.type === 'steps') {
    if (!Array.isArray(block.items) || block.items.length < 1 || block.items.length > 12) throw new Error('Steps skal have 1-12 trin.');
    for (const item of block.items) {
      if (!asText(item?.title) || asText(item.title).length > 120) throw new Error('Step title skal være 1-120 tegn.');
      if (asText(item?.content).length > 500) throw new Error('Step content er over 500 tegn.');
    }
    if (asText(block.title).length > 200) throw new Error('Steps title er over 200 tegn.');
  }

  if (block.type === 'facts') {
    if (!Array.isArray(block.items) || block.items.length < 1 || block.items.length > 25) throw new Error('Facts skal have 1-25 rækker.');
    for (const item of block.items) {
      if (!asText(item?.label) || asText(item.label).length > 80) throw new Error('Fact label skal være 1-80 tegn.');
      if (!asText(item?.value) || asText(item.value).length > 300) throw new Error('Fact value skal være 1-300 tegn.');
    }
    if (asText(block.title).length > 200) throw new Error('Facts title er over 200 tegn.');
  }

  if (block.type === 'button_row') {
    if (!Array.isArray(block.buttons) || block.buttons.length < 1 || block.buttons.length > 5) throw new Error('Button Row skal have 1-5 link-knapper.');
    for (const button of block.buttons) {
      if (!asText(button?.label) || asText(button.label).length > 80) throw new Error('Button Row labels skal være 1-80 tegn.');
      if (!isPublicHttpUrl(asText(button?.url))) throw new Error('Button Row indeholder en ugyldig URL.');
    }
  }

  if (block.type === 'event') {
    if (!asText(block.title) || asText(block.title).length > 200) throw new Error('Event skal have en titel på højst 200 tegn.');
    if (asText(block.description).length > 1_500) throw new Error('Event description er over 1500 tegn.');
    if (asText(block.location).length > 300) throw new Error('Event location er over 300 tegn.');
    if (!Number.isInteger(Number(block.startEpoch)) || Number(block.startEpoch) <= 0) throw new Error('Event starttid er ugyldig.');
    if (block.endEpoch !== null && block.endEpoch !== undefined && block.endEpoch !== '') {
      if (!Number.isInteger(Number(block.endEpoch)) || Number(block.endEpoch) <= Number(block.startEpoch)) throw new Error('Event sluttid skal ligge efter starttid.');
    }
  }

  if (block.type === 'countdown') {
    if (!asText(block.title) || asText(block.title).length > 200) throw new Error('Countdown skal have en titel på højst 200 tegn.');
    if (!Number.isInteger(Number(block.targetEpoch)) || Number(block.targetEpoch) <= 0) throw new Error('Countdown target er ugyldigt.');
    if (asText(block.text).length > 800) throw new Error('Countdown text er over 800 tegn.');
  }

  if (block.type === 'code') {
    if (!String(block.code ?? '').trim() || String(block.code).length > 3_500) throw new Error('Code Snippet skal indeholde 1-3500 tegn.');
    if (asText(block.language).length > 30) throw new Error('Code language er over 30 tegn.');
    if (asText(block.caption).length > 300) throw new Error('Code caption er over 300 tegn.');
  }

  if (block.type === 'progress') {
    const current = Number(block.current);
    const total = Number(block.total);
    const segments = Number(block.segments ?? 10);
    if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0 || current < 0 || current > total) throw new Error('Progress current/total er ugyldigt.');
    if (!Number.isInteger(segments) || segments < 5 || segments > 20) throw new Error('Progress segments skal være 5-20.');
    if (asText(block.label).length > 200 || asText(block.note).length > 500) throw new Error('Progress label/note er for lang.');
  }

  if (block.type !== 'button_row') ensureGeneratedText(block, block.type);
  return true;
}