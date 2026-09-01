import { PermissionFlagsBits } from 'discord.js';

const DISCORD_ROLE_ID = /^\d{17,20}$/;

export function parseEditorRoleIds(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  const roleIds = raw.split(',').map((item) => item.trim()).filter(Boolean);
  const invalid = roleIds.filter((roleId) => !DISCORD_ROLE_ID.test(roleId));
  if (invalid.length) {
    throw new Error('EDITOR_ROLE_IDS must contain comma-separated Discord role IDs (17-20 digits).');
  }
  return [...new Set(roleIds)];
}

export function memberRoleIds(member) {
  const roles = member?.roles;
  if (Array.isArray(roles)) return roles.map(String);
  if (roles?.cache?.keys) return [...roles.cache.keys()].map(String);
  return [];
}

export function hasConfiguredEditorRole(member, editorRoleIds = []) {
  if (!editorRoleIds?.length) return false;
  const allowed = new Set(editorRoleIds.map(String));
  return memberRoleIds(member).some((roleId) => allowed.has(roleId));
}

export function hasEditorAccess(interaction, editorRoleIds = []) {
  if (!interaction?.guildId) return false;
  const permissions = interaction.memberPermissions;
  if (permissions?.has?.(PermissionFlagsBits.Administrator) || permissions?.has?.(PermissionFlagsBits.ManageGuild)) return true;
  return hasConfiguredEditorRole(interaction.member, editorRoleIds);
}
