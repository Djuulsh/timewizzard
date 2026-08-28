# Timewizzard Info Bot — clean baseline

This repository is the clean restart of the Discord information bot.

## Current scope

The baseline intentionally contains only the stable core:

- Discord login through Railway
- `/status`
- `/profil gem`
- `/profil importer`
- `/profil vis`
- `/profil liste`
- `/profil slet`
- `/post opret`
- `/post rediger`
- `/post opdater`
- `/post liste`
- `/post slet`
- Forum post with header banner, description and one compact class/resolution select menu
- 18 profile targets: 9 TBC classes × FHD/QHD
- Ephemeral profile responses
- Persistent JSON storage
- `/health` HTTP endpoint for Railway diagnostics

The Web Builder/OAuth layer is deliberately **not** part of this baseline. It should only be added after this version has been proven stable on Railway.

## Repository structure

```text
/
├── src/
│   ├── index.js
│   ├── commands.js
│   ├── config.js
│   ├── constants.js
│   ├── interactions.js
│   ├── postService.js
│   ├── render.js
│   └── storage.js
├── data/
│   └── .gitkeep
├── package.json
├── Dockerfile
├── .dockerignore
├── .gitignore
└── .env.example
```

## Discord Developer Portal

Use the same Discord Application for all three values below.

1. **General Information → Application ID** → `CLIENT_ID`
2. **Bot → Token** → `DISCORD_TOKEN`
3. Enable Developer Mode in Discord, right-click your server, **Copy Server ID** → `GUILD_ID`

Install the bot on the server with these scopes:

```text
bot
applications.commands
```

Recommended permissions:

```text
View Channels
Send Messages
Send Messages in Threads
Manage Threads
Read Message History
Embed Links
Attach Files
Use External Emojis
```

## Railway variables

Set these on the bot service:

```env
CLIENT_ID=...
DISCORD_TOKEN=...
GUILD_ID=...
DATA_DIR=/data
NODE_ENV=production
```

Do **not** add `PUBLIC_BASE_URL` or `DISCORD_CLIENT_SECRET` yet. They belong to the later Web Builder phase.

## Railway volume

Create one persistent volume and mount it at:

```text
/data
```

The bot stores:

```text
/data/store.json
/data/store.json.bak
```

Use one replica.

## Railway networking

The bot does not need a public domain for Discord itself. The clean baseline still exposes an HTTP health endpoint so networking can be tested independently later.

If you generate a Railway domain, these should work:

```text
/
/health
```

`/health` returns JSON with the running version and Discord-ready state.

## Expected startup logs

A healthy deployment should contain lines similar to:

```text
HTTP health server listening on 0.0.0.0:8080
Logged in as TimewizzardBot#....
Registered 3 guild commands for YOUR_GUILD_ID
```

## First Discord test

Run in this order:

```text
/status
/profil liste
/profil gem klasse:Warrior oplosning:FHD
/profil vis klasse:Warrior oplosning:FHD
/post opret forum:#your-forum
```

The post creation modal asks for:

- forum post title
- heading
- description
- optional banner URL
- accent color

The published forum post uses a single select menu with all 18 combinations, so the information post remains one Discord message.

## Long profile strings

For strings longer than the Discord modal limit, save a UTF-8 `.txt` file and use:

```text
/profil importer
```

When a stored string is too long for a normal ephemeral message, the bot returns it as an ephemeral TXT attachment instead.

## Next phase

Only after this baseline is verified should the project add:

1. generic block-based post builder
2. `/webbuilder`
3. public Railway domain
4. Discord OAuth
5. drag-and-drop web interface

This staged approach keeps Discord, Railway networking and OAuth failures separate and diagnosable.
