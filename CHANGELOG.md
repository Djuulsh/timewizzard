# Changelog

## 1.3.1

### Bot identity
- Added Web Builder controls for the bot's server-specific display name.
- Added an explicitly confirmed global identity section for changing the Discord bot username and avatar/logo.
- Global identity changes are kept separate because Discord rate-limits username/avatar updates and they affect every server using the bot.
- Live Discord preview now reflects the current bot display name and avatar.

### Discord Insert picker
- Added a reusable **Discord Insert** control to Markdown-enabled Builder fields.
- Added searchable People, Roles, Channels, Timewizzard Posts, Emojis and Timestamp tabs.
- Channel and role/user selections insert native Discord mention syntax at the current cursor position.
- Timewizzard forum posts insert as thread/channel mentions while normal-channel posts insert as named Discord message links.
- Added **Open in Discord** and **Copy post link** actions for published posts.

### Emoji and timestamp tools
- Added server custom emoji browsing with image previews, including animated emoji.
- Added common Unicode emoji browsing plus browser-local favorites and recently used ordering.
- Added a Discord timestamp picker with local date/time input and Discord display styles, including relative time.

### Safe mentions and autocomplete
- Mentions remain **display only / no ping** by default.
- Added an explicit **Notify whitelisted people/roles** mode; only individually selected users and roles can be allowed to notify.
- `@`, `#` and `:` autocomplete now provides quick insertion for known people/roles, channels and emojis inside Builder textareas.
- Publishing uses `allowed_mentions` with no automatic `@everyone`/`@here` parsing.

### Compatibility
- Existing v1.3 Builder data remains compatible; mention policy is additive and defaults to safe display-only behavior.
- The Discord member picker uses members already known to the bot and always supports direct User ID insertion when the bot does not have the privileged Server Members intent.

## 1.3.0

### Reliability and post lifecycle
- Published posts now have stable Builder IDs independent of Discord message/thread IDs.
- Detects when a managed Discord message, forum thread or destination disappears.
- Missing targets are marked **Deleted on Discord** while Builder data remains editable.
- Added **Re-create** flow in the original destination or a newly selected destination.
- Added destination move / repair / relink support for forum, text and announcement channels.

### Web Builder
- Added Undo / Redo.
- Added persistent revision history with restore.
- Added Markdown toolbar.
- Discord Markdown reference now shows both raw syntax and rendered examples.
- Added `\>>>` as a Timewizzard-only escape marker to end a Discord `>>>` multi-line quote by splitting Text Display components.
- Added Discord channel / role / user name resolution in preview.
- Added Media Gallery and Thumbnail blocks.
- Added DiscoHook JSON import.
- Added nested ephemeral buttons/select menus.
- Compact boolean controls keep Thumbnail spoiler and Separator divider toggles from consuming a full Inspector row.
- Separator preview now makes **Small** and **Large** spacing visibly distinct, including a live spacing sample in the Inspector.

### Discord-native Builder
- Updated native Builder branding/status to Timewizzard v1.3.0.
- Native Builder now detects deleted Discord targets when opening/listing posts and exposes **Genskab** when the original destination still exists.
- Added native Media Gallery create/edit support using `URL | description | ja/nej` rows.
- Added native Thumbnail create/edit support including spoiler state.
- Editing a Select in the native Builder now preserves existing nested ephemeral next-steps instead of silently removing them.
- Native help and `/webbuilder` descriptions now document the v1.3 feature set.

### Local development
- Added `npm run local` and `npm run local:watch` for full local bot + Web Builder testing without Railway.
- Added `.env.local.example` with a localhost OAuth callback and isolated `./data-local` storage.
- Local and production environment files are loaded explicitly, so development credentials/data can stay separate from Railway.

### Data and validation
- Storage schema upgraded to v4 with revisions, stable Builder IDs and Discord target state.
- Existing `/data/store.json` data migrates in place.
- Validation covers v1.3.0 quote escape, media blocks, nested actions and DiscoHook conversion.
- Removed runtime Web Builder patching from the startup path; v1.3.0 Web assets are committed directly to the repository.
- CI now syntax-checks the native v1.3 support layer, local startup wrapper and Builder UI.

## 1.2.2

### Builder destinations
- Web Builder can now publish to Discord forum channels, normal text channels and announcement channels.
- Discord-native `/post opret` and `/post importer` accept the same destination types.
- Forum tags remain available only for forum destinations.
- Normal-channel posts use the same Components V2 blocks, interactions, ephemeral replies and update flow as forum posts.

### Resilient deletion
- A Builder post can be removed even when its Discord channel, thread or managed message was deleted outside Timewizzard.
- Deletion performs best-effort Discord cleanup and then removes the persistent Builder record.

## 1.2.1

### Restored builder baseline
- Restored the Discord-native builder and Railway-hosted Web Builder on top of the clean deployment baseline.
- Preserved `/data/store.json` and added in-place migration.
- Restored `/status`, `/webbuilder`, clone/import/export and MerfinUI profile management.

### Discord Markdown compatibility
- Added preview support for Discord subtext (`-#`), italic, underline, strikethrough, spoilers, code, block quotes, lists and masked links.
- Added preview support for custom/animated emoji, mention-like Discord tokens and timestamps.
