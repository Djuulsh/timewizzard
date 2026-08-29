# Changelog

## 1.5.3

### Inspector & Editor UX pass
- Moved every Inspector Markdown toolbar below its related textarea, directly before Markdown help where a reference panel is present.
- Added embedded character counters to larger text fields. The counter lives in a reserved footer inside the field frame, so typed text can never overlap it.
- Character counters use subtle thresholds: neutral below 80%, yellow from 80%, orange from 95%, and red at the limit/over-limit. No extra “characters left” text is shown.
- Added textarea autosizing up to a sensible maximum height, with internal scrolling only for longer content.

### Clearer Inspector structure
- Added a consistent Inspector header showing block type and whether the block is at **POST root** or inside a named **Container**.
- Blocks inside a Container get a one-click **Move to POST root** action.
- Added a dedicated Inspector drag handle. Blocks can be dragged from the Inspector into the existing block tree or dropped onto a POST-root drop zone to move them out of a Container.
- Added lightweight **Content**, **Appearance** and collapsed **Advanced** grouping where those sections improve readability without adding unnecessary headings.
- Destructive Container actions remain visually separated from everyday editing controls.

### Inline feedback and visual editing
- Added inline URL/event validation near the field being edited instead of relying on disruptive toast errors while typing.
- Live Discord Preview elements are now linked to their Builder blocks: selecting a block highlights the matching preview element, and clicking a preview element selects the corresponding block in Blocks + Inspector.
- Mobile Markdown toolbars stay on one horizontal scrolling row instead of wrapping into several compact lines.

## 1.5.2

### Header-first Add Block workflow
- Moved the primary **+ Add block** action into the sticky `editor-head`, so adding content no longer requires scrolling to the bottom of the block list.
- Removed the permanent bottom Add Block library from the visible editor to give the block tree more room.
- Added a reusable Add Block dialog with **Recommended**, **Content**, **Structured**, **Time & Events**, **Layout**, **Interactions**, **Special** and **All** categories.
- Added block search across names, descriptions and categories.
- The picker clearly shows whether content will be inserted at **POST root** or inside a selected **Container**, and the target can be changed before insertion.
- Container `+` buttons open the same picker directly targeted at that Container.
- Added `Ctrl/Cmd + Shift + A` as a keyboard shortcut for Add Block.

### Cleaner editor header
- The editor header is now sticky while the Builder scrolls.
- **Add block**, Undo, Redo, Save and Publish remain directly available.
- Destination, History, Clone, Export JSON and Delete were moved into a compact **More** menu to reduce visual noise without hiding functionality.
- The Add Block button shows its current default target (`POST root` or the selected Container).

## 1.5.1

### Heading emoji picker
- Replaced the free-form Heading emoji/prefix field with a visual emoji control.
- Reuses the existing Discord Insert emoji browser in emoji-only mode, including Discord emoji, server emoji, search, source filters, categories, favorites and recent emoji.
- Added an explicit **None** action to publish a Heading without an emoji.
- Extended Heading emoji validation to support Discord custom emoji syntax safely.

## 1.5.0

### Category-first template browser
- Create Draft now starts on a focused **Recommended** view instead of showing the entire template library at once.
- Added category tabs for **Recommended**, **Basic**, **Community**, **Events**, **Guides**, **Updates**, **Media**, **Special** and **All**.
- Added template search across names, descriptions and categories.
- Template cards show their own icon, category and whether the layout starts as a **Plain** post or with a **Container**.

### Expanded template library
- Expanded the starter library to 25 templates.
- Added **Welcome / Onboarding**, **Rules / Guidelines**, **Staff / Team Directory**, **Meeting / Agenda**, **Weekly Schedule**, **Giveaway / Contest**, **Support / Troubleshooting**, **Class / Build Guide**, **Maintenance / Outage**, **Release / Launch** and **Live Stream**.
- Existing Announcement, Guide, FAQ, Links, Raid/Event, Recruitment, Update, Warning, Media, YouTube and MerfinUI templates were refreshed to use the new reusable smart blocks where appropriate.
- All non-empty starter templates are validated to fit one Discord message in their default state.

### Ten smart blocks
- Added **Heading** with H1/H2/H3, emoji/prefix and subtitle controls.
- Added **Callout** with Info, Success, Warning, Danger and Neutral tones.
- Added **Checklist** with completed/uncompleted items.
- Added **Steps** for numbered step-by-step instructions.
- Added **Facts / Key Values** for compact label/value information.
- Added **Button Row** with up to five URL buttons in one Discord Action Row.
- Added **Event** with Discord-native start/end timestamps and a location/channel field.
- Added **Countdown** using Discord relative timestamps that update automatically for viewers.
- Added **Code Snippet** with language, caption and fenced code output.
- Added **Progress** with current/total values, configurable bar length and optional progress note.

### Builder organization and compatibility
- Add Block now separates normal content, structured content, time/events, layout, interactions and special blocks.
- Smart blocks work both at POST root and inside Containers and participate in drag/drop, duplication, revision history and live preview.
- Advanced v1.5 blocks are protected from destructive editing in the Discord-native modal builder and redirect to Web Builder for full editing.
- Runtime and Web Builder version reporting updated to v1.5.0.

### Validation
- Validation now covers all 25 template definitions and all 10 smart block types, including Button Row rendering, timestamps, Containers, plain posts, Smart YouTube, safe mentions, nested ephemeral actions and DiscoHook import.

## 1.4.0

### Plain posts and true Containers
- New posts no longer receive an implicit colored Components V2 container.
- Root-level Text, Image, Gallery, Thumbnail, Separator, YouTube, Link, Open and Select blocks publish as a normal Components V2 post.
- Containers are now explicit hierarchical parents with their own `children` list and accent color.
- A single Discord message can mix plain root content with multiple independently colored Containers when limits allow it.
- The old post-level Accent picker is hidden in Web Builder because color now belongs to an actual Container.

### Hierarchical Web Builder
- Block tree now shows `POST → Container → child blocks` instead of flat container markers.
- Containers can be collapsed/expanded, duplicated with all children, removed while keeping their children, or deleted together with their contents.
- Blocks can be dragged between POST root and Containers and reordered inside their current parent.
- Container Inspector is simplified to an editor-only name plus one color control.
- Add Block is grouped into **Content**, **Layout**, **Interactions** and **Special** sections and clearly shows whether new content is being added to POST root or a selected Container.

### Smart YouTube
- Added a real YouTube content block.
- Paste a YouTube, youtu.be, Shorts, Embed or Live URL and Timewizzard derives the video ID, canonical Watch URL and thumbnail automatically.
- YouTube blocks can toggle thumbnail and Watch button independently and support editable title/description/button label.

### Template gallery
- New Draft now exposes visual template cards grouped by category.
- Added **Blank Post**, **Simple Announcement**, **Styled Announcement**, **Guide / Information**, **FAQ**, **Links / Resources**, **Raid / Event**, **Recruitment**, **Patch / Update Notes**, **Important / Warning**, **Media / Gallery**, **YouTube Video**, **MerfinUI Select** and **MerfinUI Profile List** templates.
- Plain templates stay plain; styled templates explicitly create a Container.

### Migration and imports
- Storage schema upgraded to v5 and Builder schema upgraded to v2.
- Existing v1.3.x flat layouts are migrated into explicit Containers so their previous colored appearance is preserved.
- Drafts, published state and revision snapshots are migrated together.
- DiscoHook imports preserve each embed / Components V2 container as a separate v1.4 Container.
- Legacy MerfinUI Profile List remains a compact single Text Display with no 18 Open buttons.

### Validation
- Validation now covers plain root publishing, explicit nested Containers, legacy flat migration, smart YouTube parsing/rendering, all starter templates, compact MerfinUI profiles, safe mentions, nested ephemeral actions and multi-embed DiscoHook import.

## 1.3.2

### Multi-embed Components V2 layouts
- Added **Embed / Container** markers to the Web Builder so one Discord message can contain several independently accented Components V2 containers.
- Each container can have its own accent color and an editor-only label.
- Live preview groups blocks by container and shows how many embeds are still fitting inside one Discord message.
- DiscoHook import now preserves multiple embeds / Components V2 containers instead of flattening everything into one container.

### Compact legacy profile list
- Removed all Open buttons from the legacy MerfinUI profile list.
- The legacy list now renders as one compact Text Display showing each class with FHD / QHD availability labels.
- The compact list is validated to remain inside one Discord message under the default layout.

### Templates
- Added ready-made **Announcement**, **Guide / information**, **FAQ**, **Links / resources** and **YouTube video** templates.
- The YouTube template includes introduction text, a YouTube thumbnail URL placeholder, a second red container and a Watch on YouTube link button.
- All new base templates are validated to fit one Discord message by default.

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
- Published posts now have stable Builder IDs independent from Discord message/thread IDs.
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
