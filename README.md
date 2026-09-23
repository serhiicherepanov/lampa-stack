# Lampa Docker Stack

Copy example env file and update by your values
```bash
cp .env.torrserver.dist .env
```

Source env variables
```bash
source .env
```

Build and start docker containers with selected **torrserver** parser
```bash
export COMPOSE_PROFILES=standalone
docker compose build
docker compose up -d
```
Start docker containers with **jackett** parser and container (`cp .env.jackett.dist .env`)
```bash
export COMPOSE_PROFILES=standalone,jackett
docker compose build
docker compose up -d
```
Start docker containers with **prowlarr** parser and container (`cp .env.prowlarr.dist .env`)
```bash
export COMPOSE_PROFILES=standalone,prowlarr
docker compose build
docker compose up -d
```
Open `https://$PROWLARR_DOMAIN`, set up Prowlarr authentication and add indexers.
The API key is taken from `PROWLARR_APIKEY`; if it is empty, copy the generated one from
*Settings → General* into `PARSER_APIKEY` and rebuild lampa.

## Default torrent parser

The parser is baked into the Lampa build. Non-empty build values always win: they overwrite the user's settings on every app start.

| Variable              | Meaning                                                        |
|-----------------------|----------------------------------------------------------------|
| `PARSER_TORRENT_TYPE` | `jackett`, `prowlarr` or `torrserver` (default `torrserver`)   |
| `PARSER_URL`          | Jackett/Prowlarr URL (default `https://$JACKETT_DOMAIN` or `https://$PROWLARR_DOMAIN`, by type) |
| `PARSER_APIKEY`       | Jackett/Prowlarr API key (default `$JACKETT_APIKEY` or `$PROWLARR_APIKEY`, by type)          |

The same applies to `TORRSERVER_DOMAIN`, `TORRSERVER_DOMAIN_TWO`, `TORRSERVER_LOGIN` and `TORRSERVER_PASSWORD`
(when a login is set, TorrServer auth is enabled and hidden from settings). Values are baked in, so rebuild after editing `.env`:
```bash
docker compose build lampa && docker compose up -d
```

## Behind Cloudflare (or another reverse proxy)

Traefik trusts `X-Forwarded-*` headers only from IPs in `TRAEFIK_TRUSTED_IPS`
(comma-separated CIDRs, defaults to [Cloudflare ranges](https://www.cloudflare.com/ips/)).
Requests that reached the proxy over HTTPS are not redirected again, so any Cloudflare SSL mode works:

- **Full (strict)** — recommended; Traefik gets a Let's Encrypt certificate via HTTP challenge on port 80
  (set `LETSENCRYPT_EMAIL` in `.env` for expiry notices).
- **Flexible** — Cloudflare talks to the origin over plain HTTP; no redirect loop.

Set `TRAEFIK_TRUSTED_IPS` in `.env` if you use a different proxy.
