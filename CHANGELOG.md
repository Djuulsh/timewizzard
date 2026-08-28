# Changelog

## 1.2.2

### Builder destinations
- Web Builder can now publish to Discord forum channels, normal text channels and announcement channels.
- Discord-native `/post opret` and `/post importer` accept the same destination types.
- Forum tags remain available only for forum destinations.
- Normal-channel posts use the same Components V2 blocks, interactions, ephemeral replies and update flow as forum posts.

### Resilient deletion
- A Builder post can now always be removed even when its Discord channel, thread or managed message was deleted outside Timewizzard.
- Deletion first performs best-effort Discord cleanup and then removes the persistent Builder record.
- Web Builder and Discord-native delete confirmations now use generic post wording instead of assuming every post is a forum thread.

### Infrastructure
- Health endpoint reports v1.2.2 and supported destination types.
- GitHub validation now checks the new destination modules and no longer requires an npm lockfile for setup-node caching.

## 1.2.1

### Restored builder baseline
- Restored the full Discord-native builder and Railway-hosted Web Builder on top of the clean, working deployment baseline.
- Preserved the clean `/data/store.json` path and added in-place migration to the builder schema.
- Restored `/status`, `/webbuilder`, clone/import/export and MerfinUI profile management.

### Discord Markdown compatibility update
- Added a startup preparation step for the Web Builder Markdown preview.
- Added preview support for Discord subtext (`-#`), italic, underline, strikethrough, spoilers, code, block quotes, lists and masked links.
- Added preview support for custom/animated emoji, mention-like Discord tokens and timestamp syntax.
- Added a built-in Markdown reference under the Web Builder Inspector.
- Added `DISCORD_MARKDOWN.md` with the supported syntax and bot-specific notes.

### Notes
- Published Components V2 Text Display content already uses Discord's native Markdown parser; this update primarily makes the browser preview and authoring help match Discord more closely.
