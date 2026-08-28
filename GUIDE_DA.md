# Shrouded Info Bot v1.2 — Web Builder guide

## Arbejdsgangen

```text
Discord /webbuilder
        ↓
Discord OAuth
        ↓
Web Builder på Railway
        ↓
Drag blocks + edit content
        ↓
Live preview
        ↓
Save
        ↓
Publish to Discord
```

Discord-builderen fra v1.1.1 eksisterer stadig og bruger samme data.

## Skærmens tre områder

### Venstre: Posts
Viser kladder og publicerede posts. En orange/ændret status betyder at builder-data er gemt, men den offentlige Discord-post endnu ikke er opdateret.

### Midten: Builder + Inspector
Her ligger alle blocks. Træk i `☰` for at ændre rækkefølgen.

Under **Add block** kan du tilføje:

- Text / Markdown
- Image / banner
- Separator
- Open + ephemeral
- Link button
- Select + ephemeral
- MerfinUI class/resolution select
- Legacy MerfinUI Open List

Klik på et block for at redigere det i Inspector.

### Højre: Live Discord preview
Previewet forsøger visuelt at efterligne Components V2 og beregner løbende om Discord-grænserne sandsynligvis tvinger posten over flere beskeder.

## True drag-and-drop

Desktop: klik/hold `☰`, træk blocket og slip det på den ønskede position.

Touch/iPad: `☰` bruger Pointer Events som touch-fallback, så blocket kan flyttes med fingeren.

## MerfinUI TXT

Vælg `MerfinUI class/resolution select` i block-listen. Inspector viser alle 18 profiler.

Klik eksempelvis:

```text
Warrior — FHD
```

Du får en stor TXT-editor. Web-versionen er ikke begrænset af Discords 4.000-tegn modal, så lange genererede strings kan indsættes direkte.

Den offentlige dropdown henter altid den seneste gemte værdi fra Railway storage.

## Save vs Publish

**Save** gemmer builder-data til Railway Volume.

På en allerede publiceret post bliver status derefter **Modified**. Den offentlige Discord-post ændrer sig først når du vælger **Publish changes**.

Det giver en staging-lignende arbejdsgang:

```text
Edit → Preview → Save → Publish
```

## Clone

Clone laver en ny kladde med samme builder og forum-destination. Den originale post ændres ikke.

## Discord OAuth-sikkerhed

Web Builder bruger Discord OAuth scopes:

```text
identify
guilds
```

Efter login kontrollerer serveren, at brugeren har adgang til den `GUILD_ID`, botten er konfigureret til, samt Manage Guild / Administrator / owner permission.

Session-cookie er HttpOnly og SameSite=Lax; på Railway HTTPS markeres den også Secure. Write-API requests afviser fremmede origins.

## Health endpoint

```text
/health
```

returnerer bot-ready status samt om Web Builder er aktiveret.
