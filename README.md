# Timewizzard Info Bot — restored v1.2.1 feature set

This repository contains the full feature set from before the failed upload/deployment cycle, restored on top of the clean Railway baseline.

## Included now

- Discord-native Post Builder
- Generic Components V2 blocks: text, image/banner, separator, Open + ephemeral, URL button and select + ephemeral
- MerfinUI class/resolution compact select
- Legacy MerfinUI Open list
- Direct management of all 18 FHD/QHD profile strings
- Move block to position, duplicate block and edit block
- Draft / Modified / Synced post state
- Clone, import and export posts
- Railway-hosted Web Builder
- Real browser drag-and-drop plus touch/pointer support
- Side-by-side Discord-style live preview
- Discord OAuth login restricted to the configured guild and Manage Server/Admin/owner users
- `/webbuilder`
- `/status` compatibility command
- `/health` deployment diagnostic endpoint
- Expanded Discord Markdown-aware Web Builder preview and built-in Markdown reference

## Discord Markdown

Text blocks are published through Discord Components V2 `Text Display`, so Discord's normal Markdown rules apply to the final Discord message. The Web Builder preview now mirrors the common syntax more closely, including:

```text
# Heading
## Heading
### Heading
-# Subtext
**bold**
*italic*
__underline__
~~strikethrough~~
||spoiler||
> quote
>>> multi-line quote
- bullet
1. ordered item
[text](https://example.com)
```

It also previews custom/animated emoji, Discord mention-like tokens and timestamps such as `<t:UNIX:R>`.

See [DISCORD_MARKDOWN.md](DISCORD_MARKDOWN.md) for the complete reference.

## Persistent storage

The clean baseline already used:

```text
/data/store.json
/data/store.json.bak
```

The restored builder continues to use the same file. On first startup it migrates the clean-baseline profile/post schema in-place to the builder schema, so a second database file is not created.

## Railway variables

Required for the Discord bot:

```env
CLIENT_ID=...
DISCORD_TOKEN=...
GUILD_ID=...
DATA_DIR=/data
NODE_ENV=production
```

Required to enable the Web Builder:

```env
DISCORD_CLIENT_SECRET=...
PUBLIC_BASE_URL=https://YOUR-SERVICE.up.railway.app
```

`PUBLIC_BASE_URL` must not include a trailing slash.

If the two Web Builder variables are omitted, Discord still runs normally and `/status` reports the Web Builder as disabled.

## Discord OAuth redirect

In Discord Developer Portal → OAuth2 → Redirects, add exactly:

```text
https://YOUR-SERVICE.up.railway.app/auth/discord/callback
```

The hostname must be identical to `PUBLIC_BASE_URL`.

## Railway public domain

The Discord bot itself does not need a domain, but the Web Builder does. Generate a public Railway domain for the bot service and point it at the same service/PORT that serves `/health`.

Test in this order after deployment:

```text
https://YOUR-SERVICE.up.railway.app/health
https://YOUR-SERVICE.up.railway.app/auth/discord
https://YOUR-SERVICE.up.railway.app/builder
```

Expected `/health` fields include:

```json
{
  "ok": true,
  "version": "1.2.1",
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

`/post opret` supports these templates:

```text
Tom builder
MerfinUI — compact select
MerfinUI — Open list (legacy)
```

## Recommended first test

1. Wait for Railway to deploy the newest `main` commit.
2. Run `/status` in Discord.
3. Confirm `/profil liste` still shows your profile data.
4. Open `/health` in the browser.
5. Confirm `webBuilder: true` if the two Web Builder variables are configured.
6. Open `/webbuilder` and create or edit a Text block.
7. Test `-# Subtext`, headings, emphasis, lists, quotes, links and spoilers in the live preview.
8. Publish a test post and compare the final rendering in Discord.

The Web Builder and the Discord-native builder use the same persistent storage and publishing engine.
