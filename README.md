# Timewizzard Info Bot v1.7.0

> Current release: **v1.7.0** — a Discord Components V2 information-post builder with a Discord-native workflow and an OAuth-protected Web Builder.

Timewizzard creates, previews, publishes and maintains structured information posts in Discord forum, text and announcement channels. It supports plain Components V2 posts, optional colored Containers, reusable templates, interactive controls and private TXT delivery for long generated strings.

## Current highlights

- Hierarchical `POST → optional Containers → content blocks` editor.
- 36 starter templates, including announcements, guides, events, recruitment, media, YouTube, Quick Announcements and WeakAura layouts.
- Text, Heading, Callout, Checklist, Steps, Facts, Button Row, Event, Countdown, Code, Progress, Gallery, Thumbnail and Smart YouTube blocks.
- Drag-and-drop on desktop and tap-to-move controls on touch devices.
- Desktop, tablet and phone layouts with desktop/mobile preview widths.
- Undo/Redo, revision history, local crash recovery and pre-publish review.
- Safe mentions, Discord user/role/channel insertion, emoji browser and timestamp picker.
- Deleted-target detection and safe Republish/recovery workflows. Destination changes are staged and do not alter Discord until Publish or Republish is confirmed.
- New posts can use up to five forum tags, shown only for forum destinations, and existing forum posts can receive a separately managed Timewizzard message.
- DiscoHook JSON import and round-trip Builder JSON import/export in both Discord and the Web Builder (up to 20 MB).
- Legacy MerfinUI and TBC ZIP selectors migrate to direct Discord download buttons.
- Configurable Discord message splitting in the Publish/Republish review: automatic, one message per top-level block/container, or an exact valid message count.
- Discord OAuth access control for the Web Builder.
- Discord message context action: right-click a managed post and choose **Apps → Edit in Web Builder** to open that exact post.

## Long String Select TXT delivery

A String Select option can contain up to **200,000 characters**. When a Discord user chooses an option, Timewizzard sends the complete value privately as a UTF-8 `.txt` attachment instead of trying to place it inside a Discord text component.

The Web Builder provides:

- a character counter on the actual String Select textarea;
- direct UTF-8 `.txt` import for each option;
- file names derived from the selected option label;
- a 20 MB Save/Preview request limit;
- size-aware revision compaction for large builders.

The automated validation suite includes an intact 100,000-character TXT delivery test.

## Builder structure

A plain post can contain content directly:

```text
POST
├─ Text
├─ Image
├─ Separator
└─ Link
```

A styled post can contain one or more explicit Containers:

```text
POST
├─ Text
├─ Container: Raid Information
│  ├─ Text
│  ├─ Image
│  └─ Link
└─ Container: Important
   └─ Text
```

Root content and multiple Containers can be published in the same Discord message when Discord's component and text limits allow it.

## Discord installation and permissions

Timewizzard currently runs in **single-server mode**. `GUILD_ID` selects the one Discord server where slash commands are registered, interactions are accepted and the Web Builder is authorized.

Install the Discord application with these OAuth2 scopes:

```text
bot
applications.commands
```

Timewizzard slash commands require the invoking member to have **Manage Server** (`ManageGuild`). The server owner and members with Administrator also satisfy this requirement. The channel must not deny the member the **Use Application Commands** permission.

The bot needs **View Channel**, **Send Messages**, **Send Messages in Threads** and **Read Message History** in every destination. It also needs **Create Public Threads** when Timewizzard creates a new forum post. Publishing into an archived forum post automatically attempts to reopen it; locked posts additionally require **Manage Threads**.

If the bot is moved to another server:

1. Enable Discord Developer Mode.
2. Copy the new server ID.
3. Replace `GUILD_ID` in Railway or the local environment.
4. Restart/redeploy Timewizzard so guild commands are registered again.

Running the same deployment safely across several servers requires guild-isolated storage and authorization; simply removing the guild check would expose one server's Builder data to another.

## Railway configuration

Required variables:

```env
CLIENT_ID=...
DISCORD_TOKEN=...
GUILD_ID=...
DATA_DIR=/data
NODE_ENV=production
```

Additional variables required for the Web Builder:

```env
DISCORD_CLIENT_SECRET=...
PUBLIC_BASE_URL=https://YOUR-SERVICE.up.railway.app
```

`PUBLIC_BASE_URL` must not have a trailing slash. Add this redirect URL in the Discord Developer Portal:

```text
https://YOUR-SERVICE.up.railway.app/auth/discord/callback
```

Railway persistent storage uses:

```text
/data/store.json
/data/store.json.bak
```

The current storage schema is v6 and the Builder schema is v2. Legacy layouts are migrated while preserving their published appearance.

## Local development

Requirements:

- Node.js 24.17 or newer;
- a Discord bot/application;
- a Discord server where you have Manage Server.

Install the exact dependency versions recorded in `package-lock.json`:

```bash
npm ci
```

Copy `.env.local.example` to `.env.local`, insert the local Discord values and add this OAuth redirect in the Discord Developer Portal:

```text
http://127.0.0.1:3000/auth/discord/callback
```

Start the complete local bot and Web Builder:

```bash
npm run local
```

Use automatic restart while editing:

```bash
npm run local:watch
```

Local endpoints:

```text
http://127.0.0.1:3000/health
http://127.0.0.1:3000/auth/discord
http://127.0.0.1:3000/builder
```

Local data is stored in `./data-local`, separate from Railway's `/data` volume. Do not run the Railway and local processes simultaneously with the same bot token; both processes would receive interactions from the configured server.

## Health check

Open:

```text
https://YOUR-SERVICE.up.railway.app/health
```

The response includes the live bot state, authoritative runtime version, Web Builder state, supported destinations, feature registry and uptime. A ready v1.7.0 deployment starts with:

```json
{
  "ok": true,
  "version": "1.7.0",
  "webBuilder": true,
  "oauthLoginPath": "/auth/discord",
  "builderPath": "/builder",
  "supportedDestinations": ["forum", "forum-post", "text", "announcement"]
}
```

## Discord commands

```text
/status
/post opret
/post rediger
/post opdater
/post slet
/post liste
/post klon
/post eksporter
/post importer
/profil gem
/profil importer
/profil vis
/profil slet
/profil liste
/hjaelp
/webbuilder
```

`/webbuilder` returns a private, versioned launch panel with links to the OAuth-protected Builder and both operating guides. The current feature summary covers staged destinations, Publish/Republish review, configurable message splitting, JSON round trips, long TXT delivery and direct ZIP download buttons.

For an existing published post, right-click its starter message or any Timewizzard continuation message and choose **Apps → Edit in Web Builder**. The bot verifies that the message belongs to a managed post, checks **Manage Server**, and returns a private deep link. The selected post opens automatically after Discord OAuth.

## Deleted Discord targets

A Builder record is not removed merely because its Discord message, thread or destination disappears:

```text
Published + live
      ↓
Discord target deleted externally
      ↓
Deleted on Discord
      ↓
Builder data remains editable
      ↓
Republish in the original or a new destination
```

Only the explicit Builder Delete action removes the persistent record.

## Markdown quote escape

Discord `>>>` normally quotes the rest of the same Text Display. Timewizzard supports `\>>>` as a Builder-only boundary:

```text
>>> This is quoted
Still quoted
\>>>
This is normal text again
```

The `\>>>` line is not published. See [`DISCORD_MARKDOWN.md`](DISCORD_MARKDOWN.md) for the complete Markdown reference.

## Validation

Run the complete validation suite with:

```bash
npm test
```

GitHub Actions runs the same validation on pushes to `main` and `feature/**`. It covers Builder rendering, schema migration, all templates and smart blocks, String Select TXT delivery, safe mentions, Discord limits, UI asset contracts and responsive device contracts.

Additional documentation:

- [`GUIDE_EN.md`](GUIDE_EN.md) — English operating guide.
- [`GUIDE_DA.md`](GUIDE_DA.md) — Danish operating guide.
- [`DISCORD_MARKDOWN.md`](DISCORD_MARKDOWN.md) — supported Discord Markdown.
- [`CHANGELOG.md`](CHANGELOG.md) — release history.
