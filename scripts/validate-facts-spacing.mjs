import { smartBlockToComponents } from '../src/builder/smartBlocks.js';

const gap = '\u00A0\u00A0\u00A0';
const block = {
  type: 'facts',
  title: 'Quick facts',
  items: [
    { label: 'Status1222', value: 'Ready' },
    { label: 'Owner454123', value: 'Team' }
  ]
};

const content = smartBlockToComponents(block)?.[0]?.content || '';
if (!content.includes(`**Status1222**${gap}Ready`)) {
  throw new Error('Facts must use the same three-NBSP visual gap after Status1222.');
}
if (!content.includes(`**Owner454123**${gap}Team`)) {
  throw new Error('Facts must use the same three-NBSP visual gap after Owner454123.');
}
if (content.includes('\u2003')) {
  throw new Error('Facts must not use EM SPACE alignment anymore.');
}

console.log('Facts fixed visual gap validation passed.');
