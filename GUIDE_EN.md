# Timewizzard Info Bot v1.7.0 — Web Builder Guide

> [Dansk guide](GUIDE_DA.md) · [README](README.md)

Timewizzard builds and maintains Discord Components V2 information posts in forum, text and announcement channels, as well as inside existing forum posts. `/webbuilder` returns a private launch panel with secure Discord OAuth login.

## Access and permissions

- Timewizzard currently operates in single-server mode through `GUILD_ID`.
- The user must own the server, have Administrator/**Manage Server** (`ManageGuild`), or have a role listed in `EDITOR_ROLE_IDS`.
- Configure multiple editor roles as a comma-separated Railway/local value, for example `EDITOR_ROLE_IDS=123456789012345678,987654321098765432`.
- Also allow the role under **Server Settings → Integrations → Timewizzard** so Discord exposes the commands to that role.
- The bot needs permission to view the destination, send messages and read message history.
- Creating forum posts requires **Create Public Threads**. Archived or locked posts may also require **Manage Threads**.
- The `@` picker's complete member list requires **Server Members Intent** under **Discord Developer Portal → Bot → Privileged Gateway Intents** and a bot restart or redeploy.

## Normal workflow

```text
/webbuilder → Discord OAuth → Create draft → Edit → Save
            → Publish review → Publish/Republish → Discord
```

**Save** only stores Builder data. Discord is not changed until **Publish** or **Republish** is confirmed.

## Open a post from the context menu

Right-click the starter message or any continuation message in a published Timewizzard post, then choose **Apps → Edit in Web Builder**. The bot verifies that the message belongs to a managed post and returns a private link that opens that exact post after Discord OAuth.

The action requires **Manage Server** or a configured editor role and is available only in the server where Timewizzard commands are registered. Ordinary messages that do not belong to a Timewizzard post cannot be opened as Builder data.

## Create draft

1. Enter a title.
2. Select a forum, text or announcement channel, or an existing forum post.
3. Forum tags appear only when the destination is a forum channel. Up to five can be selected.
4. Choose one of the 36 starter templates or begin with a blank post.

Quick Announcement templates provide a fast starting point, while the other categories cover guides, events, onboarding, recruitment, media, WeakAuras and more.

## Workspace

- **Posts** lists drafts and published posts. It becomes a drawer on smaller screens.
- **Blocks** shows the post hierarchy: `POST → optional Containers → content blocks`.
- **Inspector** edits the selected block.
- **Discord Preview** renders the layout and supports desktop and mobile widths.

Desktop supports drag-and-drop. Touch devices use tap-to-move. Undo/Redo, revision history and local crash recovery protect work during editing.

## Content and structure

Plain content and colored Containers can coexist in one post. The Web Builder supports Text, Heading, Image, Thumbnail, Separator, Callout, Checklist, Steps, Facts, Button Row, Event, Countdown, Code, Progress, Gallery, YouTube, selects and nested ephemeral actions.

Preview elements can be selected to open their associated block in the Inspector. Markdown tools, emoji/mention pickers, timestamps, inline validation and character counters help keep content compatible with Discord.

**Facts / Key Values** preserve entered spaces and line breaks inside each Value field. A final line containing a space can therefore be used as an intentional blank line before the next key/value row.

### Guild and default emojis

**Discord Insert → Emojis** combines every custom emoji from the configured guild with the complete locally hosted Emoji 17 default library. Select **Guild** or **Default**, search by name and related terms, or filter by category. The library also includes skin-tone variations and is loaded only when the emoji picker is used. Large result sets are rendered incrementally through **Show more** to keep the Builder responsive. Default emojis require no additional Discord permission; guild emojis are fetched from the server connected to the bot.

### GIPHY images

When `GIPHY_API_KEY` is configured, **Search GIPHY** appears beside Image/Banner and Thumbnail URL fields, with a compact GIPHY button for every Gallery item. The dialog shows up to 50 trending GIFs or search results per API call and automatically inserts the selected direct GIF URL. **View more on GIPHY** opens GIPHY with the current search without loading another page through the bot's API key. If alt text is empty, the GIPHY result title is used as a starting point.

Create a Web API key at [GIPHY Developers](https://developers.giphy.com/) and add it as a Railway variable. GIPHY requires client-side API calls and visible **Powered by GIPHY** attribution; the picker handles both requirements.

## Publish and Message split

The Publish/Republish dialog validates the real Discord payload and shows the destination, message count, blocks, components, mention behavior and warnings.

Message split is selected in the same dialog:

- **Automatic** uses the fewest Discord messages possible.
- **One message per top-level block** starts every top-level block or Container in a separate message.
- **Choose exact number** accepts a specific count when Discord limits allow it.

## Destination and Republish

Changing Destination on a published post stores a pending change. It does not immediately move or recreate the existing Discord post.

When **Republish** is confirmed, the new target is created first. The previous Discord post is removed only after the new publication succeeds. If publication fails, the previous post remains intact and the pending destination can be retried.

If a Discord message, thread or destination is deleted externally, Timewizzard preserves the Builder data and offers Republish to a valid destination.

## JSON import and export

**Export JSON** downloads the complete Builder definition. **Import Builder JSON** loads a current or supported legacy export as a new draft. The maximum file/request size is 20 MB.

DiscoHook JSON can also be imported and converted into supported blocks.

## Long String Select values

A String Select option can contain up to **200,000 characters**. Its textarea has a dedicated character counter and accepts pasted text or an imported UTF-8 `.txt` file.

When a Discord user selects the option, the complete value is delivered privately as a UTF-8 `.txt` attachment. Automated validation covers an intact 100,000-character value.

## Download buttons

Known legacy selectors for `MerfinUI_v7.80.zip` and `TBC_AddOns.zip` migrate to direct Discord link buttons. New downloads should use Button Row links instead of code strings.

## Local development

Copy `.env.local.example` to `.env.local`, add local Discord/OAuth values and any comma-separated `EDITOR_ROLE_IDS`, then run:

```bash
npm ci
npm run local
```

Open the Web Builder through `http://127.0.0.1:3000/auth/discord`. Local data is stored in `./data-local`; production data normally lives in the Railway volume at `/data`.

Run the complete validation suite with:

```bash
npm test
```
