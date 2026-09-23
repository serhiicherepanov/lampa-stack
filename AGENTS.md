# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

A self-hosted Docker Compose stack for the [Lampa](https://github.com/yumata/lampa) media web app:

| Service      | Source                              | Role                                                        |
|--------------|-------------------------------------|-------------------------------------------------------------|
| `traefik`    | `traefik/` (traefik v2.11 + bash)   | Reverse proxy, TLS via Let's Encrypt (HTTP challenge)       |
| `lampa`      | `lampa/` (node build → nginx)       | Vendored + patched Lampa frontend, served as static files   |
| `torrserver` | `torrserver/` (yourok/torrserver)   | Torrent streaming server                                    |
| `jackett`    | `lscr.io/linuxserver/jackett` image | Optional torrent indexer/parser                             |

Each service is exposed by Traefik on its own domain (`LAMPA_DOMAIN`, `TORRSERVER_DOMAIN`, `JACKETT_DOMAIN`) using Docker labels in `docker-compose.yml`.

## Layout

- `docker-compose.yml` — the whole stack: routers, CORS middlewares, healthchecks, logging.
- `.env.torrserver.dist`, `.env.jackett.dist` — env templates; copy one to `.env` (gitignored).
- `traefik/traefik.d/` — Traefik file-provider config (e.g. the `gzip@file` middleware).
- `data/` — bind-mounted runtime state. Only seed configs are tracked (`torrserver/config/settings.json`, `jackett/config/Jackett/ServerConfig.json`); everything else is ignored via per-directory `.gitignore`. Never commit certificates (`data/traefik/letsencrypt/`), torrents or generated config.
- `lampa/` — vendored Lampa source (upstream: yumata/lampa). See below.

## Compose profiles

- `standalone` — enables `traefik`. `lampa` and `torrserver` have no profile and always start.
- `jackett` — adds the Jackett container.

```bash
cp .env.torrserver.dist .env        # or .env.jackett.dist
source .env
export COMPOSE_PROFILES=standalone  # or standalone,jackett
docker compose build
docker compose up -d
```

Validate compose changes with `docker compose config` before committing.

## Lampa build and stack-specific config

The Lampa app is built with gulp (`lampa/gulpfile.js`):

```bash
cd lampa
npm install
npm run build   # gulp build → lampa/build/web (what the Docker image serves)
npm start       # dev server with watch + browser-sync on http://localhost:3000
npm test        # vitest (spec/)
```

`build/`, `dest/` and `node_modules/` are gitignored.

Deployment-specific values are baked into the frontend **at build time**: source files contain `%%PLACEHOLDER%%` tokens, and `build_web()` in `gulpfile.js` replaces them in the bundled `app.js` from `process.env` (with defaults). Supported placeholders:

`LAMPA_DOMAIN`, `TORRSERVER_DOMAIN`, `TORRSERVER_DOMAIN_TWO`, `TORRSERVER_LOGIN`, `TORRSERVER_PASSWORD`, `PARSER_TORRENT_TYPE`, `JACKETT_DOMAIN`, `JACKETT_APIKEY`.

They are used in `src/app.js`, `src/components/settings/params.js` and `src/interaction/torserver.js` to pre-fill user settings (only when the user has not set them yet).

To add a new build-time setting, change all of:
1. the placeholder in `lampa/src/...`;
2. the `replace()` chain and default in `build_web()` in `lampa/gulpfile.js`;
3. an `ARG` in `lampa/Dockerfile`;
4. `build.args` of the `lampa` service in `docker-compose.yml`;
5. the `.env.*.dist` templates, if users should set it.

Note: the Docker build only receives the variables listed under `build.args` in `docker-compose.yml`. Anything declared as `ARG` but not passed there falls back to the gulpfile default. Settings are baked in, so changing `.env` requires `docker compose build lampa`.

## Working on the vendored Lampa code

- It is a large upstream codebase (ES modules bundled by rollup + babel, jQuery-based UI, SCSS in `src/sass`, HTML templates as JS in `src/templates`, translations in `src/lang` and `public/lang`, plugins in `plugins/`). Comments are mostly in Russian.
- Keep local changes minimal and targeted so upstream diffs stay readable. Match the surrounding style of each file (4-space indent, same `var`/`let` usage).
- Do not reformat or bulk-lint vendored files, and do not touch `public/vender/` (third-party libs).
- When adding user-facing strings, add keys to every language file in `src/lang/`.

## Traefik notes

- Every router is attached to both entrypoints: `unsecure` (:80) and `default` (:443, TLS, Let's Encrypt resolver `default` via HTTP challenge on :80, account email from `LETSENCRYPT_EMAIL`).
- HTTP→HTTPS redirect is the `https-redirect@file` middleware (`traefik/traefik.d/redirect.toml`), listed first on every router. It honours `X-Forwarded-Proto`, which Traefik keeps only from `forwardedHeaders.trustedIPs` (env `TRAEFIK_TRUSTED_IPS`, defaults to Cloudflare ranges). This is what prevents the redirect loop behind Cloudflare in "Flexible" SSL mode.
- Do **not** switch back to entrypoint-level redirect (`entrypoints.unsecure.http.redirections`) or entrypoint `http.middlewares`: the former ignores trusted proxies, and the latter is also applied to the ACME challenge router and breaks certificate issuance.
- CORS is configured per service with header middlewares; torrserver and jackett restrict origins to `LAMPA_DOMAIN` and its subdomains.
- `gzip@file` is intentionally **not** applied to torrserver (see commit `disable gzip for torrserver`); keep it that way.
- The dashboard is at `https://$LAMPA_DOMAIN/traefik/dashboard/` behind basic auth defined in the labels.

## Conventions

- Branch: `master`. Commit messages are short and lowercase (e.g. `build args`, `disable gzip for torrserver`).
- Never commit `.env`, secrets, API keys or anything under ignored `data/` paths.
