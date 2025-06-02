#!/bin/sh

set -euo pipefail

# strip https:// or https:// from domain if necessary
export APP_HOST=${APP_DOMAIN##*://}

echo using API: ${API_DOMAIN} with port: ${API_PORT}
echo using APP: ${APP_DOMAIN}

exec caddy run --config Caddyfile --adapter caddyfile 2>&1