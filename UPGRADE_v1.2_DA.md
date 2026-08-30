# Opgradering: v1.1 / v1.1.1 → v1.2.0

> **Historisk migrationsreference:** Trinnene nedenfor gælder kun opgradering fra v1.1 til v1.2. Brug [README.md](README.md) og [GUIDE_DA.md](GUIDE_DA.md) til den aktuelle v1.7.0-konfiguration og arbejdsgang.

v1.2 kan deployes direkte oven på både v1.1 og v1.1.1. v1.1-data migreres automatisk til storage version 3, og eksisterende profile-strenge/posts bevares. Hvis du allerede kører v1.1.1, bruges samme storage version uden ekstra migration.

## 1. Backup

Tag først en backup af Railway Volume / `bot-data.json`.

## 2. Upload v1.2 til GitHub

Filerne i ZIP'en skal ligge direkte i repository-roden:

```text
src/
web/
scripts/
examples/
package.json
Dockerfile
README.md
...
```

Commit/push fx:

```bash
git add .
git commit -m "Upgrade Shrouded Info Bot to v1.2"
git push
```

## 3. Railway: behold Volume

Behold det samme Volume og samme `DATA_DIR` som før.

Eksisterende variables forbliver:

```env
CLIENT_ID=...
DISCORD_TOKEN=...
GUILD_ID=...
DATA_DIR=/data
NODE_ENV=production
```

## 4. Railway: generér offentlig domain

Åbn bot-servicen i Railway og gå til Networking/Settings. Generér en public domain.

Eksempel:

```text
https://shrouded-bot-production.up.railway.app
```

Kopiér adressen uden trailing slash.

## 5. Discord Developer Portal: OAuth2 redirect

Åbn den samme Discord Application som botten bruger.

Find OAuth2 Redirects og tilføj:

```text
https://DIN-RAILWAY-DOMAIN/auth/discord/callback
```

Eksempel:

```text
https://shrouded-bot-production.up.railway.app/auth/discord/callback
```

Gem ændringen.

Dette er en OAuth2 redirect og er ikke det samme som bottens Install Link. Din private app kan fortsat have standard Install Link sat til **None / Ingen**.

## 6. Discord Client Secret

Find/Reset din Discord Application Client Secret i Developer Portal.

Gem den som ny Railway variable:

```env
DISCORD_CLIENT_SECRET=DIN_HEMMELIGE_CLIENT_SECRET
```

Client Secret må ikke lægges i GitHub.

## 7. PUBLIC_BASE_URL

Tilføj også:

```env
PUBLIC_BASE_URL=https://DIN-RAILWAY-DOMAIN
```

Den skal være identisk med starten af redirect URL'en og må ikke have `/auth/...` bagefter.

## 8. Redeploy

Redeploy Railway-servicen.

I loggen skal du se noget i stil med:

```text
HTTP/Web Builder server listening on port 8080
Logged in as TimewizzardBot#....
Registered 4 guild commands for ...
Web Builder enabled at https://.../builder
```

## 9. Test Web Builder

Kør i Discord:

```text
/webbuilder
```

Tryk **Åbn Web Builder**.

Browseren sender dig gennem Discord OAuth. For at få adgang skal kontoen:

- være medlem af den konfigurerede server, og
- være server owner, Administrator eller have **Administrer server**.

## 10. Test drag-and-drop

Åbn en kladde/post og træk i `☰`-håndtaget på et block.

Previewet til højre skal opdatere med det samme. Rækkefølgen er kun lokal indtil **Save**.

Efter Save på en publiceret post vil den stå som **Modified**, indtil du trykker **Publish changes**.
