# Changelog

## 1.2.0

### Web Builder
- Added Railway-hosted browser UI.
- Added Discord OAuth2 login using `identify guilds`.
- Added guild permission gate for Manage Guild, Administrator or guild owner.
- Added desktop drag-and-drop and touch/pointer block reordering.
- Added live Discord-style side-by-side preview.
- Added browser block inspector for Text, Image, Separator, Open, Link, Select, MerfinUI Select and legacy Open List.
- Added browser post create/save/publish/clone/delete flow.
- Added browser profile TXT editor without the 4,000-character Discord modal limit.
- Added visual Synced / Modified / Unsaved state.
- Added browser JSON export.

### Discord
- Added `/webbuilder` command.
- All v1.1.1 native builder features remain available.

### Infrastructure
- Health endpoint is now served by the shared bot/Web Builder HTTP server.
- Added optional `DISCORD_CLIENT_SECRET` and `PUBLIC_BASE_URL` configuration.
- Persistent storage schema remains version 3, compatible with v1.1.1.

## 1.2.1

- Repository-ready full build with all runtime files included.
- `/webbuilder` now links directly to `/auth/discord` before entering `/builder`.
- `/health` exposes the running version and expected OAuth/builder route paths for deployment diagnostics.
- Startup log prints both OAuth login and builder URLs when Web Builder is enabled.
