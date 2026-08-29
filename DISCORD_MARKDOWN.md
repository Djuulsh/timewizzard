# Discord Markdown in Timewizzard v1.3.0

Timewizzard publishes text through Discord Components V2 `Text Display` components. Discord itself remains authoritative for final rendering, while Web Builder previews the supported syntax.

## Text styles

```text
*italic*          _italic_
**bold**
***bold italic***
__underline__
__*underline italic*__
__**underline bold**__
__***underline bold italic***__
~~strikethrough~~
||spoiler||
```

## Structure

```text
# Heading 1
## Heading 2
### Heading 3
-# Subtext

- Bullet
* Bullet
  - Nested bullet

1. Ordered item
2. Ordered item

> Single-line quote
>>> Multi-line quote
```

`-#` must begin the line and include a space after `#`.

## Multi-line quote escape

Discord `>>>` continues quoting the rest of the same Text Display. Timewizzard v1.3.0 adds a builder-only escape marker:

```text
>>> This starts a multi-line quote
Still quoted
\>>>
This text is normal again
```

Rules:

- `\>>>` must be on its own line.
- The marker is not shown in Discord.
- Timewizzard splits the text into a new Text Display component at that point.
- This gives the builder an explicit way to end a Discord multi-line quote.

The Web Builder toolbar includes a quote-stop action for inserting this marker.

## Links

```text
[Visible text](https://example.com)
<https://example.com>
```

Masked links are normal hyperlinks. They do not trigger bot interactions or ephemeral replies; use an Open block or Select block for that.

## Code

Inline code uses one backtick. Multi-line code uses three backticks before and after the block. An optional language name may follow the opening fence.

## Discord-specific tokens

```text
<@USER_ID>                  User mention
<@&ROLE_ID>                 Role mention
<#CHANNEL_ID>               Channel mention
</command:COMMAND_ID>       Slash-command mention
<:name:EMOJI_ID>            Custom emoji
<a:name:EMOJI_ID>           Animated custom emoji
<t:UNIX_TIMESTAMP>          Timestamp
<t:UNIX_TIMESTAMP:R>        Relative timestamp
```

Timestamp styles supported by Discord are `t`, `T`, `d`, `D`, `f`, `F`, `s`, `S`, and `R`.

## Web Builder reference

Under **Discord Markdown reference · syntax + result**, Timewizzard shows each raw markup example next to its rendered result. The preview also resolves known Discord channel, role and user IDs to names when that guild data is available.

## Safety

Published builder messages use `allowedMentions: { parse: [] }`. Mention syntax can be displayed without automatically pinging users or roles.
