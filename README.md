# Shrouded Info Bot v1.2.0

v1.2 contains the full v1.1.1 Discord-native builder **plus a Railway-hosted Web Builder**.

The Web Builder uses the same `bot-data.json`, builder schema, profile strings and publishing engine as the Discord bot. You can switch between Discord and the browser without maintaining two copies of a post.

## v1.2 highlights

- True drag-and-drop block ordering in the browser.
- Touch/pointer drag support in addition to desktop drag-and-drop.
- Discord OAuth login.
- Access restricted to the configured guild and users with **Manage Server** / Administrator / guild owner access.
- Side-by-side Discord-style live preview.
- Create, edit, save, clone, publish and delete posts from the browser.
- Direct editing of all 18 MerfinUI FHD/QHD TXT values, including strings over Discord modal limits.
- Generic text, image, separator, Open, URL and select blocks.
- Existing Discord-native v1.1.1 builder remains fully available.
- `/webbuilder` gives an ephemeral button to open the web interface.

## Required Railway variables

Existing variables:

```env
CLIENT_ID=...
DISCORD_TOKEN=...
GUILD_ID=...
DATA_DIR=/data
NODE_ENV=production
```

New for the Web Builder:

```env
DISCORD_CLIENT_SECRET=...
PUBLIC_BASE_URL=https://YOUR-SERVICE.up.railway.app
```

If the two web variables are omitted, the Discord bot still runs, but the Web Builder reports that it is not configured.

## Required Discord OAuth redirect

In Discord Developer Portal, add this exact redirect URL:

```text
https://YOUR-SERVICE.up.railway.app/auth/discord/callback
```

It must match `PUBLIC_BASE_URL` exactly.

## Railway public domain

v1.1.x did not require a public domain. **v1.2 Web Builder does.**

Generate a Railway domain for the bot service, then use that HTTPS domain as `PUBLIC_BASE_URL`.

## Open the builder

In Discord:

```text
/webbuilder
```

or visit:

```text
https://YOUR-SERVICE.up.railway.app/builder
```

The browser redirects to Discord OAuth and asks for `identify` + `guilds`. It does not request message-content access.

Read [UPGRADE_v1.2_DA.md](UPGRADE_v1.2_DA.md) for the complete deployment procedure.
