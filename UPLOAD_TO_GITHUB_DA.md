# Upload hele v1.2.1 til GitHub

Denne ZIP er **repository-ready**: `package.json`, `Dockerfile`, `src/`, `web/` osv. ligger direkte i ZIP-roden.
Der er ingen ekstra `shrouded-info-bot/` undermappe.

## Vigtigt
Upload **ikke** `.env` eller Discord-token til GitHub. ZIP'en indeholder kun `.env.example`.

## Erstat et eksisterende repository via CMD

1. Lav en sikkerhedskopi/tag af din nuværende version.
2. Pak denne ZIP ud i en midlertidig mappe.
3. Gå til din lokale Git-repository-mappe.
4. Sørg for at du er på `main` og har hentet seneste version:

```cmd
git checkout main
git pull origin main
```

5. Fjern de gamle trackede projektfiler, men behold `.git`:

```cmd
git rm -r --ignore-unmatch .
```

6. Kopiér **indholdet** fra denne udpakkede ZIP ind i repository-roden.
7. Kontrollér at `package.json`, `Dockerfile`, `src` og `web` ligger direkte i repository-roden.
8. Commit og push:

```cmd
git add -A
git commit -m "Upgrade Shrouded Info Bot to v1.2.1 full repository"
git push origin main
```

## Railway variables

```env
CLIENT_ID=...
DISCORD_TOKEN=...
GUILD_ID=...
DATA_DIR=/data
DISCORD_CLIENT_SECRET=...
PUBLIC_BASE_URL=https://DIN-SERVICE.up.railway.app
NODE_ENV=production
```

Discord Developer Portal -> OAuth2 -> Redirects skal indeholde præcis:

```text
https://DIN-SERVICE.up.railway.app/auth/discord/callback
```

## Efter deployment

Test i denne rækkefølge:

```text
https://DIN-SERVICE.up.railway.app/health
https://DIN-SERVICE.up.railway.app/auth/discord
https://DIN-SERVICE.up.railway.app/builder
```

`/health` skal vise `version: 1.2.1`, `oauthLoginPath: /auth/discord` og `builderPath: /builder`.
Hvis `/health` viser en anden version, deployer Railway ikke denne repository-version.
