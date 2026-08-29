import { FACTS_LABEL_WIDTH, smartBlockToComponents } from '../src/builder/smartBlocks.js';

const nbsp = '\u00A0';
const block = {
  type: 'facts',
  title: 'Quick facts',
  items: [
    { label: 'Status1222', value: 'Ready' },
    { label: 'Owner454123', value: 'Team' },
    { label: 'VeryLongLabelThatWillClip', value: 'Long' }
  ]
};

const content = smartBlockToComponents(block)?.[0]?.content || '';
const statusPadding = nbsp.repeat(FACTS_LABEL_WIDTH - 'Status1222'.length);
const ownerPadding = nbsp.repeat(FACTS_LABEL_WIDTH - 'Owner454123'.length);

if (!content.includes(`\`Status1222${statusPadding}\` Ready`)) {
  throw new Error('Facts must render Status1222 as an 18-character inline-code label cell.');
}
if (!content.includes(`\`Owner454123${ownerPadding}\` Team`)) {
  throw new Error('Facts must render Owner454123 with the same fixed label-cell width.');
}
if (!content.includes('`VeryLongLabelThat…` Long')) {
  throw new Error('Facts labels longer than the fixed cell must clip with an ellipsis without changing stored data.');
}
if (content.includes('**Status1222**') || content.includes('\u2003')) {
  throw new Error('Facts must not use proportional bold labels or EM SPACE alignment anymore.');
}

console.log(`Facts fixed-width inline-code label validation passed (${FACTS_LABEL_WIDTH} characters).`);
