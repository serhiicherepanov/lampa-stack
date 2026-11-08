#!/bin/sh
# Enables TorrServer HTTP auth when TORRSERVER_LOGIN is set: writes accs.db from
# TORRSERVER_LOGIN / TORRSERVER_PASSWORD on every start (so it follows .env) and
# passes --httpauth via TS_HTTPAUTH. The same values are baked into the Lampa
# frontend at build time, so users never type them.
set -e

if [ -n "$TORRSERVER_LOGIN" ]; then
  mkdir -p "$TS_CONF_PATH"
  printf '{"%s":"%s"}\n' "$TORRSERVER_LOGIN" "$TORRSERVER_PASSWORD" > "$TS_CONF_PATH/accs.db"
  export TS_HTTPAUTH=1
fi

exec /docker-entrypoint.sh
