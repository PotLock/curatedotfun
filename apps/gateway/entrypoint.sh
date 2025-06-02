#!/bin/sh

set -euo pipefail

# for backwards compatibility, seperates host and port from url
# export FRONTEND_DOMAIN=${FRONTEND_DOMAIN:-${FRONTEND_HOST%:*}}
# export FRONTEND_PORT=${FRONTEND_PORT:-${FRONTEND_HOST##*:}}

export API_DOMAIN=${API_DOMAIN:-${API_HOST%:*}}
export API_PORT=${API_PORT:-${API_HOST##*:}}

# strip https:// or https:// from domain if necessary
# FRONTEND_DOMAIN=${FRONTEND_DOMAIN##*://}
API_DOMAIN=${API_DOMAIN##*://}

# echo using frontend: ${FRONTEND_DOMAIN} with port: ${FRONTEND_PORT}
echo using API: ${API_DOMAIN} with port: ${API_PORT}

exec caddy run --config Caddyfile --adapter caddyfile 2>&1