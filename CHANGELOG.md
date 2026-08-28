# Changelog

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
