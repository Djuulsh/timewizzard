# Timewizzard Info Bot v1.3.0

Timewizzard is a Discord Components V2 information-post builder with both a Discord-native builder and a Railway-hosted Web Builder.

## v1.3.0 highlights

- Publish to forum, text and announcement channels.
- Stable Builder IDs separated from Discord message/thread IDs.
- Detect posts deleted directly in Discord and mark them **Deleted on Discord** without losing builder data.
- **Re-create** deleted Discord posts in the same destination, or choose a new destination if the original channel no longer exists.
- Change destination / repair / relink published posts while preserving builder history.
- Local Undo / Redo in Web Builder.
- Persistent revision history with restore.
- Markdown toolbar for headings, bold, italic, underline, strike, subtext, quotes, lists, code, links and spoilers.
- Markdown reference showing both raw syntax and rendered result.
- Timewizzard multi-line quote escape marker `\>>>` on its own line. At publish time it splits the Text Display so following text is no longer part of a Discord `>>>` quote.
- Discord mention preview resolves known channel, role and user names.
- Media Gallery and Thumbnail Components V2 blocks.
- DiscoHook JSON import with warnings for unsupported interactive fields.
- Nested ephemeral button/select flows.
- MerfinUI FHD/QHD profile management and compact class/resolution select remain supported.

## Persistent storage

Railway uses:

```text
/data/store.json
/data/store.json.bak
```

v1.3.0 migrates the existing store in place. The storage schema adds stable `builderId`, Discord target state and revision history while preserving existing profiles, drafts and published posts.

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
  "version": "1.3.0",
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

GitHub Actions runs `npm run validate` on every push to `main`. The v1.3.0 validation covers the compact MerfinUI template, quote escape splitting, Media Gallery/Thumbnail rendering, nested ephemeral actions and DiscoHook conversion.
