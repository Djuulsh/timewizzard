# Timewizzard Info Bot v1.4.0

Timewizzard is a Discord Components V2 information-post builder with both a Discord-native builder and a Railway-hosted Web Builder.

## v1.4.0 highlights

- **Plain posts are truly plain.** A new post no longer receives an invisible/implicit colored container.
- **Containers are explicit.** Add a Container only when you want an embed-style colored section.
- **Hierarchical Web Builder:** `POST → optional Containers → content blocks`.
- Drag content between the POST root and containers, reorder blocks, collapse containers and duplicate an entire container with its contents.
- Each Container owns its own accent color. The old post-level accent picker is hidden from the Web Builder.
- Simplified Container Inspector: internal name, one color control and explicit keep/delete actions.
- Structured **Add Block** menu grouped into Content, Layout, Interactions and Special.
- Smart **YouTube block**: paste a normal YouTube, youtu.be, Shorts or Live URL and Timewizzard derives the video ID, thumbnail and canonical Watch link.
- Expanded template gallery with Blank, Simple Announcement, Styled Announcement, Guide, FAQ, Links, Raid/Event, Recruitment, Patch/Update, Warning, Media/Gallery, YouTube and MerfinUI starters.
- New Draft uses visual template cards instead of relying only on a long dropdown.
- Legacy MerfinUI Profile List remains compact and has no 18 individual Open buttons.
- Existing v1.3.x builders migrate to schema v2 while preserving their old colored-container appearance.
- DiscoHook imports preserve separate embeds as separate v1.4 Containers.

All v1.3 features remain available: deleted-post Re-create, destination repair, revision history, Discord Insert, emoji browser, safe mentions, timestamps, Bot Identity, nested ephemeral actions, media gallery and thumbnail blocks.

## Builder structure

A plain post can contain content directly:

```text
POST
├─ Text
├─ Image
├─ Separator
└─ Link
```

A styled post explicitly contains one or more Containers:

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

Root content and multiple Containers can still be published in the same Discord message when Discord's component/text limits allow it.

## Local testing without Railway

Timewizzard can run as a complete local Discord bot + Web Builder. Railway is not required for development or testing.

1. Install Node.js 24.17+ and clone the repository.
2. Run `npm install`.
3. Copy `.env.local.example` to `.env.local` and insert the Discord bot/application values.
4. In Discord Developer Portal → OAuth2 → Redirects, add exactly:

```text
http://127.0.0.1:3000/auth/discord/callback
```

5. Start Timewizzard locally:

```bash
npm run local
```

For automatic restart while editing source files:

```bash
npm run local:watch
```

Then test:

```text
http://127.0.0.1:3000/health
http://127.0.0.1:3000/auth/discord
http://127.0.0.1:3000/builder
```

Local data is intentionally stored separately in `./data-local`, so local tests do not touch the Railway `/data/store.json` volume. The local process still connects directly to Discord, so a working internet connection and valid Discord credentials are required.

If Railway comes back online while the same bot token is running locally, stop one of the two instances before testing interactions to avoid two bot processes handling the same guild. A separate Discord development bot is the safest long-term option.

## Persistent storage

Railway uses:

```text
/data/store.json
/data/store.json.bak
```

v1.4.0 uses storage schema **v5**. Existing v1.3.x data migrates in place to Builder schema v2. Old flat container-marker layouts are converted to explicit hierarchical Containers so their public appearance is preserved.

## Railway variables

Required:

```env
CLIENT_ID=...
DISCORD_TOKEN=...
GUILD_ID=...
DATA_DIR=/data
NODE_ENV=production
```

Required for Web Builder:

```env
DISCORD_CLIENT_SECRET=...
PUBLIC_BASE_URL=https://YOUR-SERVICE.up.railway.app
```

`PUBLIC_BASE_URL` must not have a trailing slash.

Discord OAuth redirect:

```text
https://YOUR-SERVICE.up.railway.app/auth/discord/callback
```

## Health check

Open:

```text
https://YOUR-SERVICE.up.railway.app/health
```

Expected version:

```json
{
  "ok": true,
  "version": "1.4.0",
  "webBuilder": true,
  "oauthLoginPath": "/auth/discord",
  "builderPath": "/builder"
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

## Deleted / missing Discord targets

A published Builder record is not deleted just because its Discord message or forum thread disappears.

```text
Published + live
      ↓
Discord message/thread deleted externally
      ↓
🔴 Deleted on Discord
      ↓
Edit / Preview still available
      ↓
Re-create in original destination
or choose a new destination
```

Only the explicit Builder **Delete** action removes the persistent Builder record.

## Markdown multi-line quote escape

Discord `>>>` normally quotes the rest of the same Text Display. Timewizzard adds this builder-only marker:

```text
>>> This is quoted
Still quoted
\>>>
This is normal text again
```

The `\>>>` line is not sent as visible text. It becomes a boundary between two Text Display components.

See `DISCORD_MARKDOWN.md` for the complete Markdown reference.

## Validation

GitHub Actions runs `npm run validate` on every push to `main`. v1.4 validates plain root posts, explicit Containers, legacy migration, smart YouTube parsing/rendering, all starter templates, quote escape, media blocks, nested ephemeral actions, safe mentions and multi-embed DiscoHook import.
