# Timewizzard Info Bot v1.7.0 — Web Builder-guide

> [English guide](GUIDE_EN.md) · [README](README.md)

Timewizzard bygger og vedligeholder Discord Components V2-opslag i forum-, tekst- og announcement-kanaler samt i eksisterende forum-posts. `/webbuilder` sender et privat startpanel med sikker Discord OAuth-login.

## Adgang og tilladelser

- Timewizzard kører aktuelt i single-server mode via `GUILD_ID`.
- Brugeren skal være serverejer, have Administrator/**Manage Server** (`ManageGuild`) eller have en rolle angivet i `EDITOR_ROLE_IDS`.
- Flere editor-roller angives kommasepareret i Railway og lokalt, eksempelvis `EDITOR_ROLE_IDS=123456789012345678,987654321098765432`.
- Rollen skal også tillades under **Server Settings → Integrations → Timewizzard**, så Discord viser kommandoerne for rollen.
- Botten skal kunne se destinationen, sende beskeder og læse beskedhistorik.
- Nye forum-posts kræver **Create Public Threads**. Arkiverede eller låste posts kan også kræve **Manage Threads**.
- `@`-vælgerens komplette medlemsliste kræver **Server Members Intent** under **Discord Developer Portal → Bot → Privileged Gateway Intents** samt en genstart eller redeploy af botten.

## Normal arbejdsgang

```text
/webbuilder → Discord OAuth → Create draft → Edit → Save
            → Publish review → Publish/Republish → Discord
```

**Save** gemmer kun Builder-data. Discord ændres først, når du bekræfter **Publish** eller **Republish**.

## Åbn et opslag med højreklik

Højreklik på startbeskeden eller en fortsættelsesbesked i et publiceret Timewizzard-opslag, og vælg **Apps → Edit in Web Builder**. Botten kontrollerer, at beskeden tilhører et administreret opslag, og sender et privat link, som åbner præcis dette opslag efter Discord OAuth.

Funktionen kræver **Manage Server** eller en konfigureret editor-rolle og vises kun på den server, hvor Timewizzard-kommandoerne er registreret. Almindelige beskeder, som ikke tilhører et Timewizzard-opslag, kan ikke åbnes som Builder-data.

## Create draft

1. Skriv en titel.
2. Vælg en forum-, tekst- eller announcement-kanal eller en eksisterende forum-post.
3. Forum-tags vises kun, når destinationen er en forumkanal. Der kan vælges op til fem.
4. Vælg en af de 36 startskabeloner, eller begynd tomt.

Quick Announcement-skabeloner giver en hurtig start, mens de øvrige kategorier dækker guides, events, onboarding, rekruttering, medier, WeakAuras og meget mere.

## Arbejdsområdet

- **Posts** viser kladder og publicerede opslag. På mindre skærme åbnes listen som en drawer.
- **Blocks** viser opslagets hierarki: `POST → valgfrie Containers → indholdsblokke`.
- **Inspector** redigerer den valgte blok.
- **Discord Preview** viser layoutet og kan skifte mellem desktop- og mobilbredde.

Desktop understøtter drag-and-drop. På touch-enheder bruges tap-to-move. Undo/Redo, revisionshistorik og lokal crash recovery beskytter arbejdet under redigering.

## Indhold og struktur

Plain indhold og farvede Containers kan blandes i samme opslag. Web Builderen understøtter blandt andet Text, Heading, Image, Thumbnail, Separator, Callout, Checklist, Steps, Facts, Button Row, Event, Countdown, Code, Progress, Gallery, YouTube, selects og nested ephemeral actions.

Preview-elementer kan vælges direkte for at åbne den tilhørende blok i Inspector. Markdown-værktøjer, emoji/mention-vælgere, timestamps, inline-validering og tegnoptællere hjælper med Discord-kompatibelt indhold.

### Guild- og standard-emojis

**Discord Insert → Emojis** samler alle custom emojis fra den konfigurerede guild med det komplette lokalt hostede Emoji 17-standardbibliotek. Vælg **Guild** eller **Default**, søg på navn og relaterede ord, eller filtrér efter kategori. Biblioteket indeholder også hudfarvevariationer og indlæses først, når emoji-vælgeren bruges. Store resultater vises trinvist med **Show more** for at holde Builderen hurtig. Standard-emojis kræver ingen ekstra Discord-permission; guild-emojis hentes fra den server, botten er forbundet til.

### GIPHY-billeder

Når `GIPHY_API_KEY` er konfigureret, vises **Search GIPHY** ved URL-felterne i Image/Banner og Thumbnail samt en kompakt GIPHY-knap ved hvert Gallery-element. Dialogen viser op til 50 trending GIFs eller søgeresultater pr. API-kald og indsætter automatisk den valgte direkte GIF-URL. **View more on GIPHY** åbner GIPHY med den aktuelle søgning uden at hente endnu en side gennem botens API-nøgle. Hvis alt-teksten er tom, bruges GIPHY-resultatets titel som udgangspunkt.

Opret en Web API-nøgle på [GIPHY Developers](https://developers.giphy.com/) og tilføj den som Railway-variabel. GIPHY kræver klient-side API-kald og synlig **Powered by GIPHY**-attribution; begge dele håndteres af vælgeren.

## Publish og Message split

Publish/Republish-dialogen validerer den rigtige Discord-payload og viser destination, antal beskeder, blocks, komponenter, mentions og advarsler.

Message split vælges i samme dialog:

- **Automatic** bruger færrest mulige Discord-beskeder.
- **One message per top-level block** starter hver top-level block eller Container i en ny besked.
- **Choose exact number** accepterer et bestemt antal, når Discord-grænserne gør det muligt.

## Destination og Republish

Når Destination ændres på et publiceret opslag, gemmes valget som en afventende ændring. Den eksisterende Discord-post flyttes eller genskabes ikke med det samme.

Ved **Republish** oprettes den nye destination først. Den gamle Discord-post ryddes først, når den nye publicering er lykkedes. Hvis publiceringen fejler, forbliver den gamle post intakt, og den afventende destination kan prøves igen.

Hvis en Discord-message, thread eller destination slettes eksternt, bevarer Timewizzard Builder-data og tilbyder Republish til en gyldig destination.

## JSON import og export

**Export JSON** downloader hele Builder-definitionen. **Import Builder JSON** indlæser en nuværende eller understøttet legacy-export som en ny kladde. Maksimal fil/request-størrelse er 20 MB.

DiscoHook JSON kan også importeres og konverteres til understøttede blokke.

## Lange String Select-værdier

En String Select-option kan indeholde op til **200.000 tegn**. Den faktiske textarea viser sin egen tegntæller og kan fyldes ved at indsætte tekst eller importere en UTF-8 `.txt`-fil.

Når en Discord-bruger vælger optionen, modtager brugeren værdien privat som en UTF-8 `.txt`-vedhæftning. En test dækker komplette værdier på 100.000 tegn.

## Download-knapper

Kendte legacy-selects til `MerfinUI_v7.80.zip` og `TBC_AddOns.zip` migreres til direkte Discord-linkknapper. Nye downloads bør oprettes som Button Row-links frem for codestrings.

## Lokal udvikling

Kopiér `.env.local.example` til `.env.local`, tilføj lokale Discord/OAuth-værdier og eventuelle kommaseparerede `EDITOR_ROLE_IDS`, og kør:

```bash
npm ci
npm run local
```

Web Builderen åbnes via `http://127.0.0.1:3000/auth/discord`, og lokale data gemmes i `./data-local`. Produktionsdata ligger normalt i Railway-volumen på `/data`.

Kør hele valideringen med:

```bash
npm test
```
