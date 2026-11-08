FROM ghcr.io/yourok/torrserver
RUN set -eux; \
  apk add --no-cache bash
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
