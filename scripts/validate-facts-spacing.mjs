import { smartBlockToComponents, validateSmartBlock } from '../src/builder/smartBlocks.js';

const block = {
  type: 'facts',
  title: 'Quick facts',
  items: [
    { label: 'Status', value: 'Ready' },
    { label: 'Owner', value: 'A long value that may wrap naturally in Discord without ever flowing beneath the label.' },
    { label: 'Updates', value: '<#123456789012345678>' }
  ]
};

const content = smartBlockToComponents(block)?.[0]?.content || '';
if (!content.includes('**Status**\nReady')) {
  throw new Error('Facts must render each label above its value.');
}
if (!content.includes('**Owner**\nA long value')) {
  throw new Error('Facts values must start on their own line below the label.');
}
if (!content.includes('**Updates**\n<#123456789012345678>')) {
  throw new Error('Facts must preserve normal Discord Markdown/mentions in values.');
}
if (content.includes('\u00A0') || content.includes('\u2003') || content.includes('`Status')) {
  throw new Error('Facts must not use fixed-width spacing or inline-code label cells.');
}

const preservedValue = '-# @Blackshatter , @Benzoic , @Enchgeden , @Virusimunden, <@106491116743852032>\n ';
const preservedBlock = {
  type: 'facts',
  title: '',
  items: [
    { label: 'Editors', value: preservedValue },
    { label: 'Status', value: 'Ready' }
  ]
};
validateSmartBlock(preservedBlock);
const preservedContent = smartBlockToComponents(preservedBlock)?.[0]?.content || '';
const expectedPreservedContent = `**Editors**\n${preservedValue}\n**Status**\nReady`;
if (preservedContent !== expectedPreservedContent) {
  throw new Error('Facts must preserve intentional spaces and line breaks before the next key/value row.');
}

console.log('Facts wrap-safe and whitespace-preserving label/value validation passed.');
