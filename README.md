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

## Behind Cloudflare (or another reverse proxy)

Traefik trusts `X-Forwarded-*` headers only from IPs in `TRAEFIK_TRUSTED_IPS`
(comma-separated CIDRs, defaults to [Cloudflare ranges](https://www.cloudflare.com/ips/)).
Requests that reached the proxy over HTTPS are not redirected again, so any Cloudflare SSL mode works:

- **Full (strict)** — recommended; Traefik gets a Let's Encrypt certificate via HTTP challenge on port 80.
- **Flexible** — Cloudflare talks to the origin over plain HTTP; no redirect loop.

Set `TRAEFIK_TRUSTED_IPS` in `.env` if you use a different proxy.
