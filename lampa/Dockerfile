# syntax=docker/dockerfile:1
FROM node:22-alpine3.19 AS builder
ARG NPM_REGISTRY=https://registry.npmjs.org/
WORKDIR /opt/lampa

# Dependencies first: this layer is reused until package*.json changes.
# The npm cache mount survives failed builds, so a retry only fetches what is missing.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm config set registry "$NPM_REGISTRY" \
    && npm config set fetch-retries 6 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --no-audit --no-fund

COPY . .

# Build-time settings are declared after npm ci so changing them does not reinstall dependencies
ARG TORRSERVER_DOMAIN
ARG TORRSERVER_DOMAIN_TWO
ARG TORRSERVER_LOGIN
ARG TORRSERVER_PASSWORD
ARG PARSER_TORRENT_TYPE
ARG JACKETT_DOMAIN
ARG JACKETT_APIKEY
ARG PARSER_URL
ARG PARSER_APIKEY
RUN npm start build

FROM nginx
COPY --from=builder /opt/lampa/build/web /usr/share/nginx/html
