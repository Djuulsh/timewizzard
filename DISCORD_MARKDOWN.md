# Discord Markdown in Timewizzard

Timewizzard publishes text through Discord Components V2 `Text Display` components. Discord documents Text Display as Markdown text, so normal Discord Markdown applies to builder text blocks and ephemeral text actions.

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

## Links

```text
[Visible text](https://example.com)
<https://example.com>
```

Masked links are normal hyperlinks. They do not trigger bot interactions or ephemeral replies; use an Open block or Select block for that.

## Code

Inline code uses one backtick around the text. Multi-line code uses three backticks before and after the block. An optional language name may follow the opening fence.

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

## Safety in this bot

Published builder messages use `allowedMentions: { parse: [] }`. Mention syntax can still be displayed by Discord, but the bot deliberately prevents broad automatic mention parsing/notifications.

## Web Builder preview

The Web Builder now previews headings, subtext, bold/italic/underline combinations, strikethrough, spoilers, inline and fenced code, quotes, lists, masked links, custom/animated emojis, Discord mention tokens and timestamps.

The browser preview is still an approximation. Discord itself remains authoritative for the final rendering.
