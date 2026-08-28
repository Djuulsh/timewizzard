import { MessageFlags } from 'discord.js';
import { findClass, findResolution } from './constants.js';
import { safeFileName } from './utils.js';

export function buildProfileReply(classKey, resolutionKey, generatedString) {
  const wowClass = findClass(classKey);
  const resolution = findResolution(resolutionKey);

  if (!wowClass || !resolution) {
    return {
      content: 'Den valgte class eller opløsning findes ikke.',
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    };
  }

  const heading = `${wowClass.name} — ${resolution.name}`;

  if (!generatedString) {
    return {
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
      components: [{
        type: 17,
        components: [{
          type: 10,
          content: `## ${heading}\nDenne tekststreng er ikke blevet oprettet endnu.`
        }]
      }]
    };
  }

  const codeBlock = `## ${heading}\n\n\`\`\`text\n${generatedString}\n\`\`\``;

  if (!generatedString.includes('```') && codeBlock.length <= 4_000) {
    return {
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
      components: [{
        type: 10,
        content: codeBlock
      }]
    };
  }

  const fileName = `${safeFileName(wowClass.name)}-${resolution.key}.txt`;
  return {
    content: `## ${heading}\nTekststrengen er vedhæftet som en tekstfil.`,
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
    files: [{
      attachment: Buffer.from(generatedString, 'utf8'),
      name: fileName
    }]
  };
}
