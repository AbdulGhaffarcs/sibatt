#!/bin/sh
set -eu

: "${BASIC_AUTH_USER:?BASIC_AUTH_USER must be set}"
: "${BASIC_AUTH_PASSWORD:?BASIC_AUTH_PASSWORD must be set}"

htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASSWORD" >/dev/null
exec nginx -g 'daemon off;'