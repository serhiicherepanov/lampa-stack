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
Start docker containers with **jackett** parser and container
```bash
export COMPOSE_PROFILES=standalone,jackett
docker compose build
docker compose up -d
```

## Default torrent parser

The parser is baked into the Lampa build (users can still change it in *Settings → Parser*):

| Variable              | Meaning                                                        |
|-----------------------|----------------------------------------------------------------|
| `PARSER_TORRENT_TYPE` | `jackett`, `prowlarr` or `torrserver` (default `torrserver`)   |
| `PARSER_URL`          | Jackett/Prowlarr URL (default `https://$JACKETT_DOMAIN`)       |
| `PARSER_APIKEY`       | Jackett/Prowlarr API key (default `$JACKETT_APIKEY`)           |

Values are applied in the browser on the first start after they change, so rebuild after editing `.env`:
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
