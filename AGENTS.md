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
- `traefik/traefik.d/` — Traefik file-provider config (`gzip@file`, `https-redirect@file`); bind-mounted into the container, so edits apply without rebuilding (Traefik watches the directory).
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

Deployment-specific values are baked into the frontend **at build time**. All `%%PLACEHOLDER%%` tokens live in one module, `lampa/src/utils/build_env.js`, and `build_web()` in `gulpfile.js` replaces them in the bundled `app.js` from `process.env` (with defaults). Code reads them only via `BuildEnv.get(name)` / `BuildEnv.url(name)`.

**Never use a `%%PLACEHOLDER%%` literal directly in code.** Replacement runs *after* rollup, and rollup constant-folds expressions over the literal placeholder string (e.g. `'%%X%%' ? a : b` is always `a`, `'%%X%%' == 'jackett'` is always false and the branch is dropped). The dynamic lookup in `build_env.js` prevents that.

Current values: `TORRSERVER_DOMAIN`, `TORRSERVER_DOMAIN_TWO`, `TORRSERVER_LOGIN`, `TORRSERVER_PASSWORD`, `PARSER_TORRENT_TYPE`, `PARSER_URL`, `PARSER_APIKEY`. Build values **always take priority**: `buildEnv()` in `src/components/settings/params.js` writes every non-empty one into the user's settings on each start, overwriting manual changes. `PARSER_URL`/`PARSER_APIKEY` default to `https://$JACKETT_DOMAIN` / `$JACKETT_APIKEY` and are written to `jackett_*` or `prowlarr_*` depending on the type. When `TORRSERVER_LOGIN` is set, auth is forced on and the auth block is removed from Settings → TorrServer (`src/components/settings/component.js`). Note that these values, including the password, are readable by anyone in the public `app.js`.

To add a new build-time setting, change all of:
1. `lampa/src/utils/build_env.js` and the code that reads it via `BuildEnv`;
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
